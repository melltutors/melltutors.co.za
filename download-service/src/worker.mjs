import {CATALOGUE,COURSES,cleanInput,sign,verify,privateHash,secretMatches,csvCell,downloadName} from './core.mjs';
import {driveFile} from './drive.mjs';
const seconds=()=>Math.floor(Date.now()/1000);
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
const fail=(message,status=400)=>json({error:message},status);
const allowedOrigins=env=>(env.ALLOWED_ORIGINS||'').split(',').filter(Boolean);
const formOrigin=(request,env,url)=>env.MODE==='api'&&allowedOrigins(env).includes(request.headers.get('Origin'))?request.headers.get('Origin'):url.origin;
const cookieValue=(request,name)=>(request.headers.get('Cookie')||'').split(';').map(c=>c.trim()).find(c=>c.startsWith(name+'='))?.slice(name.length+1);
async function adminAllowed(request,env){return await secretMatches(request.headers.get('Authorization')?.replace(/^Bearer /,''),env.ADMIN_SECRET)||!!await verify(cookieValue(request,'mell_admin'),env.TOKEN_SECRET,'admin');}
function secured(response,env,request){
  const r=new Response(response.body,response);r.headers.set('X-Content-Type-Options','nosniff');r.headers.set('Referrer-Policy','no-referrer');r.headers.set('X-Frame-Options','DENY');
  r.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  r.headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
  if(env.MODE!=='production'){r.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');r.headers.set('Cache-Control','no-store');}
  if(env.MODE==='api'&&new URL(request.url).pathname.startsWith('/api/')&&allowedOrigins(env).includes(request.headers.get('Origin'))){
    r.headers.set('Access-Control-Allow-Origin',request.headers.get('Origin'));r.headers.set('Vary','Origin');
    r.headers.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');r.headers.set('Access-Control-Allow-Headers','Content-Type');
  }
  return r;
}
async function smallBody(request){
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw Error('Use the request form.');
  if(Number(request.headers.get('content-length'))>4096)throw Error('The form is too large.');
  const reader=request.body?.getReader();if(!reader)throw Error('Please complete the form.');
  let bytes=0,chunks=[];
  while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>4096){await reader.cancel();throw Error('The form is too large.');}chunks.push(value);}
  const data=new Uint8Array(bytes);let offset=0;for(const c of chunks){data.set(c,offset);offset+=c.length;}
  try{return JSON.parse(new TextDecoder().decode(data));}catch{throw Error('Please reload the form.');}
}
async function rate(db,key,limit,now){
  const bucket=Math.floor(now/3600);
  return !!await db.prepare('INSERT INTO rate_windows(key,hits,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET hits=hits+1 WHERE hits<? RETURNING hits').bind(key+':'+bucket,(bucket+1)*3600+3600,limit).first();
}
async function preview(request,env,url){
  if(env.MODE==='production')return null;
  if(env.MODE==='api')return url.pathname.startsWith('/api/')?null:fail('Not found.',404);
  const key=url.searchParams.get('preview');
  if(key&&await secretMatches(key,env.PREVIEW_KEY)){
    const token=await sign({kind:'preview',exp:seconds()+86400},env.TOKEN_SECRET);url.searchParams.delete('preview');
    return new Response(null,{status:303,headers:{Location:url.pathname+url.search,'Set-Cookie':`mell_preview=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${url.protocol==='https:'?'; Secure':''}`,'Cache-Control':'no-store'}});
  }
  const cookie=(request.headers.get('Cookie')||'').split(';').map(c=>c.trim()).find(c=>c.startsWith('mell_preview='))?.slice(13);
  if(await verify(cookie,env.TOKEN_SECRET,'preview'))return null;
  if(url.pathname.startsWith('/api/'))return fail('Open your private preview link first.',401);
  return new Response('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>MELL · Private preview</title><style>body{font:18px/1.7 system-ui;background:#f6f6f2;color:#182421;max-width:640px;margin:15vh auto;padding:24px}h1{font:italic 52px Georgia}</style><p>MELL TUTORS</p><h1>A little work in progress.</h1><p>This preview is private. Open the review link supplied by Mamamedia.</p></html>',{status:401,headers:{'Content-Type':'text/html; charset=utf-8'}});
}
export async function handle(request,env,ctx={},services={}){
  const url=new URL(request.url),now=seconds();
  if(env.MODE==='api'&&['/api/form','/api/requests'].includes(url.pathname)){
    if(!allowedOrigins(env).includes(request.headers.get('Origin')))return fail('Please use the MELL form.',403);
    if(request.method==='OPTIONS')return new Response(null,{status:204});
  }
  if(url.pathname==='/admin'){
    if(request.method!=='GET')return fail('Method not allowed.',405);
    if(await secretMatches(url.searchParams.get('access'),env.ADMIN_SECRET)){
      const token=await sign({kind:'admin',exp:now+3600},env.TOKEN_SECRET);
      return new Response(null,{status:303,headers:{Location:'/admin','Set-Cookie':`mell_admin=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600${url.protocol==='https:'?'; Secure':''}`,'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
    }
    if(!await adminAllowed(request,env))return fail('Open your private owner link to view contacts.',401);
    const counts=await env.DB.prepare("SELECT COUNT(*) AS total,SUM(intent='free') AS free,SUM(intent='hardcopy') AS hardcopy,SUM(marketing_opt_in=1) AS opted FROM leads").first();
    return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>MELL · Your requests</title><style>body{font:16px/1.7 system-ui;background:#f6f6f2;color:#182421;max-width:740px;margin:8vh auto;padding:24px}h1{font:italic 48px Georgia}a{display:inline-block;padding:14px 22px;background:#1b665b;color:white;text-decoration:none;border-radius:4px}small{color:#536258}dl{display:flex;flex-wrap:wrap;gap:35px;margin:35px 0}dt{font-size:13px}dd{font-size:30px;margin:0}</style><p>MELL TUTORS · PRIVATE</p><h1>Your playbook requests.</h1><dl><div><dt>All requests</dt><dd>${counts.total||0}</dd></div><div><dt>Free pairs</dt><dd>${counts.free||0}</dd></div><div><dt>Hardcopy enquiries</dt><dd>${counts.hardcopy||0}</dd></div><div><dt>Email updates opted in</dt><dd>${counts.opted||0}</dd></div></dl><a href="/api/admin/contacts.csv">Download all contacts (CSV)</a><p>Includes email, phone where supplied, course, product, request dates and email-update preference. Repeat requests are combined.</p><small>Keep this page and exported contacts private. This owner session lasts one hour. Use only opted-in contacts for marketing emails.</small></html>`,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
  }
  if(url.pathname==='/api/admin/contacts.csv'){
    if(request.method!=='GET')return fail('Method not allowed.',405);
    if(!await adminAllowed(request,env))return fail('Not authorised.',401);
    const keys=['email','phone','course','intent','product','marketing_opt_in','privacy_version','created_at','updated_at','request_count'];
    let after='',first=true;const encoder=new TextEncoder();
    const stream=new ReadableStream({async pull(controller){try{
      if(first){controller.enqueue(encoder.encode('\uFEFF'+keys.join(',')+'\r\n'));first=false;}
      const rows=await env.DB.prepare('SELECT id,email,phone,course,intent,product,marketing_opt_in,privacy_version,created_at,updated_at,request_count FROM leads WHERE id>? ORDER BY id LIMIT 500').bind(after).all();
      if(rows.results.length){controller.enqueue(encoder.encode(rows.results.map(row=>keys.map(k=>csvCell(k.endsWith('_at')?new Date(row[k]*1000).toISOString():row[k])).join(',')).join('\r\n')+'\r\n'));after=rows.results.at(-1).id;}
      if(rows.results.length<500)controller.close();
    }catch{controller.error(new Error('Contact export interrupted. Please try again.'));}}});
    return new Response(stream,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="mell-contacts.csv"','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
  }
  const gate=await preview(request,env,url);if(gate)return gate;
  if(url.pathname==='/api/form'&&request.method==='GET')return json({token:await sign({kind:'form',origin:formOrigin(request,env,url),iat:now,exp:now+1800,nonce:crypto.randomUUID()},env.TOKEN_SECRET),courses:COURSES});
  if(url.pathname==='/api/requests'){
    if(request.method!=='POST')return fail('Method not allowed.',405);
    const origin=formOrigin(request,env,url);
    if(request.headers.get('Origin')!==origin)return fail('Please use the MELL form.',403);
    const raw=await smallBody(request),form=await verify(raw.token,env.TOKEN_SECRET,'form',now);
    if(!form||!Number.isFinite(form.iat)||now<form.iat+1)return fail('Please reload the form and try again.',403);
    if(form.origin&&form.origin!==origin)return fail('Please reload the form and try again.',403);
    if(raw.website)return fail('Unable to submit this request.',400);
    const input=cleanInput(raw);
    const ip=request.headers.get('CF-Connecting-IP')||'local';
    const ipKey=await privateHash('ip:'+ip,env.TOKEN_SECRET),mailKey=await privateHash('email:'+input.email,env.TOKEN_SECRET);
    if(!await rate(env.DB,'ip:'+ipKey,15,now)||!await rate(env.DB,'email:'+mailKey,5,now))return fail('Too many requests. Please try again in an hour.',429);
    if(input.intent==='free'){
      const files=JSON.parse(env.FILES||'{}');
      if(!files[input.course]?.algebra||!files[input.course]?.calculus||!env.GOOGLE_SERVICE_ACCOUNT)return fail('Downloads are being prepared. Please try again shortly.',503);
    }
    const lead=await env.DB.prepare('INSERT INTO leads(id,email,phone,course,intent,product,marketing_opt_in,privacy_version,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(email,course,intent,product) DO UPDATE SET phone=excluded.phone,marketing_opt_in=excluded.marketing_opt_in,privacy_version=excluded.privacy_version,updated_at=excluded.updated_at,request_count=request_count+1 RETURNING id').bind(crypto.randomUUID(),input.email,input.phone,input.course,input.intent,input.product,input.marketing,env.PRIVACY_VERSION,now,now).first();
    if(input.intent==='hardcopy')return json({intent:'hardcopy',url:CATALOGUE[input.product],product:input.product});
    const id=crypto.randomUUID(),exp=now+7200;
    await env.DB.prepare('INSERT INTO grants(id,lead_id,course,expires_at) VALUES(?,?,?,?)').bind(id,lead.id,input.course,exp).run();
    const token=await sign({kind:'download',id,course:input.course,exp},env.TOKEN_SECRET);
    return json({intent:'free',course:input.course,expiresAt:exp,downloads:COURSES[input.course].subjects.map(subject=>({subject,name:downloadName(input.course,subject),url:`/api/download/${input.course}/${subject}?t=${encodeURIComponent(token)}`}))});
  }
  const match=url.pathname.match(/^\/api\/download\/(MATH104[89]A)\/(algebra|calculus)$/);
  if(match){
    if(request.method!=='GET')return fail('Method not allowed.',405);
    const [,course,subject]=match,token=await verify(url.searchParams.get('t'),env.TOKEN_SECRET,'download',now);
    if(!token||token.course!==course||typeof token.id!=='string')return fail('This download link has expired. Request your free pair again.',403);
    const fileId=JSON.parse(env.FILES||'{}')[course]?.[subject];if(!fileId)return fail('This guide is temporarily unavailable.',503);
    const grant=await env.DB.prepare('UPDATE grants SET uses=uses+1 WHERE id=? AND course=? AND expires_at>? AND uses<12 RETURNING id').bind(token.id,course,now).first();
    if(!grant)return fail('This download link has expired. Request your free pair again.',403);
    try{
      const file=await (services.driveFile||driveFile)(fileId,env.GOOGLE_SERVICE_ACCOUNT);
      const headers={'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${downloadName(course,subject)}"`,'Cache-Control':'private, no-store'};
      const length=file.headers.get('Content-Length');if(length)headers['Content-Length']=length;
      return new Response(file.body,{headers});
    }catch{
      await env.DB.prepare('UPDATE grants SET uses=MAX(0,uses-1) WHERE id=?').bind(token.id).run();
      return fail('The download is temporarily unavailable. Please try this link again shortly.',503);
    }
  }
  if(url.pathname.startsWith('/api/'))return fail('Not found.',404);
  if(!['GET','HEAD'].includes(request.method))return fail('Method not allowed.',405);
  return env.ASSETS.fetch(request);
}
export default {
  async fetch(request,env,ctx){
    try{return secured(await handle(request,env,ctx),env,request);}
    catch(error){const known=/^(Enter |Choose |Use a |That hardcopy|Please |The form|Use the request)/.test(error.message);return secured(fail(known?error.message:'This service is temporarily unavailable. Please try again shortly.',known?400:503),env,request);}
  },
  async scheduled(event,env,ctx){
    const now=seconds();await env.DB.batch([env.DB.prepare('DELETE FROM grants WHERE expires_at<?').bind(now),env.DB.prepare('DELETE FROM rate_windows WHERE expires_at<?').bind(now)]);
  }
};
