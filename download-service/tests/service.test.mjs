import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker,{handle} from '../src/worker.mjs';
import {cleanInput,sign,verify,csvCell,CATALOGUE} from '../src/core.mjs';
const secret='test-only-secret-with-at-least-32-characters';
const now=()=>Math.floor(Date.now()/1000);
function database(){
 const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../migrations/0001_contacts.sql',import.meta.url),'utf8'));
 return{raw:db,prepare(sql){return{bind(...args){return{first:async()=>db.prepare(sql).get(...args),run:async()=>db.prepare(sql).run(...args),all:async()=>({results:db.prepare(sql).all(...args)})}},first:async()=>db.prepare(sql).get(),all:async()=>({results:db.prepare(sql).all()})}},batch:async statements=>Promise.all(statements.map(s=>s.run()))};
}
function env(){return{MODE:'production',TOKEN_SECRET:secret,PREVIEW_KEY:'private-test-key',ADMIN_SECRET:'admin-test-secret',PRIVACY_VERSION:'test',DB:database(),FILES:JSON.stringify({MATH1048A:{algebra:'a1048',calculus:'c1048'},MATH1049A:{algebra:'a1049',calculus:'c1049'}}),GOOGLE_SERVICE_ACCOUNT:'test-only',ASSETS:{fetch:async()=>new Response('public page')}};}
async function request(e,data,extra={}){
 const token=await sign({kind:'form',iat:now()-2,exp:now()+300},secret);
 return worker.fetch(new Request('https://mell.example/api/requests',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://mell.example',...extra.headers},body:JSON.stringify({email:'student@example.com',phone:'066 123 4567',course:'MATH1049A',intent:'free',token,...data})}),e,{});
}
test('normalises South African numbers; paid requests never retain supplied phone',()=>{
 assert.equal(cleanInput({email:' A@Example.COM ',phone:'(066) 123-4567',course:'MATH1048A'}).phone,'+27661234567');
 const paid=cleanInput({email:'a@example.com',phone:'+27661234567',course:'MATH1049A',intent:'hardcopy',product:'bundle'});assert.equal(paid.phone,null);assert.equal(paid.email,'a@example.com');
 for(const value of [{email:'bad'},{phone:'123'},{course:'__proto__'},{course:'MATH1048A',intent:'hardcopy',product:'bundle'},{intent:'hardcopy',product:'https://evil.example'}])assert.throws(()=>cleanInput({email:'a@example.com',phone:'0661234567',course:'MATH1049A',...value}));
});
test('signed links reject tampering, wrong purpose and expiry',async()=>{
 const token=await sign({kind:'download',id:'abc',exp:now()+60},secret);assert.ok(await verify(token,secret,'download'));
 assert.equal(await verify(token,secret,'form'),null);assert.equal(await verify(token,secret,'download',now()+70),null);
 assert.equal(await verify('x'+token,secret,'download'),null);assert.equal(await verify(token,'different-long-secret-value-1234567890','download'),null);
});
test('free request stores email, number, consent and yields exactly two private links',async()=>{
 const e=env(),res=await request(e,{marketing:true});assert.equal(res.status,200);const data=await res.json();assert.equal(data.downloads.length,2);
 assert.deepEqual(data.downloads.map(d=>d.subject),['algebra','calculus']);assert.ok(!JSON.stringify(data).includes('google'));assert.ok(!JSON.stringify(data).includes('@'));
 const lead=e.DB.raw.prepare('SELECT * FROM leads').get();assert.equal(lead.phone,'+27661234567');assert.equal(lead.marketing_opt_in,1);assert.equal(lead.course,'MATH1049A');
 const again=await request(e,{});assert.equal(again.status,200);assert.equal(e.DB.raw.prepare('SELECT count(*) AS n FROM leads').get().n,1);assert.equal(e.DB.raw.prepare('SELECT request_count FROM leads').get().request_count,2);
});
test('hardcopy email captured before correct catalogue link; 1048A rejects paid requests',async()=>{
 for(const product of ['algebra','calculus','bundle']){const e=env(),res=await request(e,{intent:'hardcopy',product});const body=await res.json();assert.equal(res.status,200);assert.equal(body.url,CATALOGUE[product]);assert.equal(e.DB.raw.prepare('SELECT phone FROM leads').get().phone,null);assert.equal(e.DB.raw.prepare('SELECT count(*) AS n FROM grants').get().n,0);}
 const e=env();assert.equal((await request(e,{intent:'hardcopy',product:'bundle',course:'MATH1048A'})).status,400);assert.equal(e.DB.raw.prepare('SELECT count(*) AS n FROM leads').get().n,0);
});
test('malformed requests, cross-site POST and honeypot never create leads',async()=>{
 for(const [data,extra,status] of [[{email:'bad'}, {},400],[{website:'bot'}, {},400],[{token:'forged'}, {},403],[{}, {headers:{Origin:'https://other.example'}},403]]){const e=env();assert.equal((await request(e,data,extra)).status,status);assert.equal(e.DB.raw.prepare('SELECT count(*) AS n FROM leads').get().n,0);}
 const e=env();assert.equal((await request(e,{email:'x'.repeat(5000)})).status,400);
});
test('rate limit is enforced and never saves raw IPs',async()=>{
 const e=env();for(let i=0;i<5;i++)assert.equal((await request(e,{})).status,200);assert.equal((await request(e,{})).status,429);
 assert.ok(e.DB.raw.prepare('SELECT key FROM rate_windows').all().every(r=>!r.key.includes('local')&&!r.key.includes('student')));
});
test('download streams approved PDF only, rejects cross-course and honours use cap',async()=>{
 const e=env(),data=await(await request(e,{})).json(),url='https://mell.example'+data.downloads[0].url;let called;
 const services={driveFile:async id=>{called=id;return new Response('%PDF-1.7 test',{headers:{'Content-Type':'application/pdf'}});}};
 const res=await handle(new Request(url),e,{},services);assert.equal(res.status,200);assert.equal(called,'a1049');assert.equal(await res.text(),'%PDF-1.7 test');assert.match(res.headers.get('Content-Disposition'),/attachment; filename="MELL-MATH1049A-Algebra-Semester-2-Free.pdf"/);
 assert.equal((await handle(new Request(url.replace('MATH1049A','MATH1048A')),e,{},services)).status,403);
 e.DB.raw.exec('UPDATE grants SET uses=12');assert.equal((await handle(new Request(url),e,{},services)).status,403);
});
test('upstream failure stays private and restores download allowance',async()=>{
 const e=env(),data=await(await request(e,{})).json(),res=await handle(new Request('https://mell.example'+data.downloads[0].url),e,{}, {driveFile:async()=>{throw Error('secret upstream detail');}});assert.equal(res.status,503);assert.ok(!(await res.text()).includes('secret'));assert.equal(e.DB.raw.prepare('SELECT uses FROM grants').get().uses,0);
});
test('preview gates pages/APIs, cleans key from URL and uses HttpOnly cookie',async()=>{
 const e=env();e.MODE='preview';assert.equal((await worker.fetch(new Request('https://mell.example/'),e)).status,401);
 assert.equal((await worker.fetch(new Request('https://mell.example/api/form'),e)).status,401);
 const res=await worker.fetch(new Request('https://mell.example/math1049a.html?preview=private-test-key'),e);assert.equal(res.status,303);assert.equal(res.headers.get('Location'),'/math1049a.html');assert.match(res.headers.get('Set-Cookie'),/HttpOnly.*Secure/);assert.equal(res.headers.get('X-Robots-Tag'),'noindex, nofollow, noarchive');
 const page=await worker.fetch(new Request('https://mell.example/',{headers:{Cookie:res.headers.get('Set-Cookie').split(';')[0]}}),e);assert.equal(page.status,200);
});
test('admin export requires its separate key and escapes spreadsheet formulas',async()=>{
 const e=env();await request(e,{email:'=SUM(1)@example.com'});
 assert.equal((await worker.fetch(new Request('https://mell.example/api/admin/contacts.csv'),e)).status,401);
 const csv=await(await worker.fetch(new Request('https://mell.example/api/admin/contacts.csv',{headers:{Authorization:'Bearer admin-test-secret'}}),e)).text();assert.match(csv,/'=sum/);assert.equal(csvCell('a"b'),'"a""b"');assert.equal(csvCell('+2766'),'"\'+2766"');
});
test('owner link starts a separate one-hour session; preview key cannot read contacts',async()=>{
 const e=env();e.MODE='preview';assert.equal((await worker.fetch(new Request('https://mell.example/admin'),e)).status,401);
 const res=await worker.fetch(new Request('https://mell.example/admin?access=admin-test-secret'),e);assert.equal(res.status,303);assert.equal(res.headers.get('Location'),'/admin');assert.match(res.headers.get('Set-Cookie'),/HttpOnly; SameSite=Strict; Max-Age=3600; Secure/);
 const headers={Cookie:res.headers.get('Set-Cookie').split(';')[0]};assert.equal((await worker.fetch(new Request('https://mell.example/admin',{headers}),e)).status,200);assert.equal((await worker.fetch(new Request('https://mell.example/api/admin/contacts.csv',{headers}),e)).status,200);
});
test('GitHub forms use only approved origins, and tokens cannot cross between origins',async()=>{
 const e=env();e.MODE='api';e.ALLOWED_ORIGINS='https://melltutors.co.za,https://www.melltutors.co.za';
 const base='https://downloads.example',origin='https://melltutors.co.za';
 const send=(path,options={})=>worker.fetch(new Request(base+path,options),e);
 assert.equal((await send('/api/form')).status,403);
 assert.equal((await send('/api/form',{headers:{Origin:'https://evil.example'}})).status,403);
 const options=await send('/api/requests',{method:'OPTIONS',headers:{Origin:origin}});assert.equal(options.status,204);assert.equal(options.headers.get('Access-Control-Allow-Origin'),origin);assert.equal(options.headers.get('Access-Control-Allow-Credentials'),null);
 const form=await send('/api/form',{headers:{Origin:origin}});assert.equal(form.status,200);assert.equal(form.headers.get('Access-Control-Allow-Origin'),origin);
 const token=await sign({kind:'form',origin,iat:now()-2,exp:now()+300},secret);
 const body=JSON.stringify({token,email:'buyer@example.com',course:'MATH1049A',intent:'hardcopy',product:'bundle'});
 const post=await send('/api/requests',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body});assert.equal(post.status,200);assert.equal((await post.json()).url,CATALOGUE.bundle);
 assert.equal((await send('/api/requests',{method:'POST',headers:{Origin:'https://www.melltutors.co.za','Content-Type':'application/json'},body})).status,403);
 assert.equal((await send('/')).status,404);assert.equal((await send('/api/admin/contacts.csv',{headers:{Origin:origin}})).status,401);
});
