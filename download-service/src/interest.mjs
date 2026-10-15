import {cleanInput,sign,verify,privateHash,csvCell} from './core.mjs';
export const CAMPAIGNS=['direct','first-year-2027','second-year-2027'];
export const PROGRAMMES=['','premium','apex','prime','focus'];
const PROGRAMME_LABELS={premium:'MELL Premium',apex:'MELL Apex',prime:'MELL Prime',focus:'MELL Focus'};
export const TIMES=['Weekday mornings','Weekday afternoons','Weekday evenings','Saturday','Sunday','Not sure yet'];
export const MODULES=['Engineering Mathematics 1','Engineering Mathematics 2','Not sure yet'];
function text(value,max,label,required=true){
  if(typeof value!=='string'||value.trim().length>max||/[\x00-\x1f\x7f]/.test(value)||(required&&!value.trim()))throw Error(`Enter ${label}.`);
  return value.trim();
}
function selections(value,options,label){
  if(!Array.isArray(value)||!value.length||value.length>options.length||value.some(v=>!options.includes(v)))throw Error(`Choose ${label}.`);
  const out=[...new Set(value)];if(out.includes('Not sure yet')&&out.length>1)throw Error(`Choose specific ${label} or “Not sure yet”, not both.`);return out;
}
export function cleanInterest(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Please complete the form.');
  const contact=cleanInput({email:raw.email,phone:raw.phone,course:'MATH1048A'});
  if(!['First year','Second year','Other','Not sure yet'].includes(raw.year))throw Error('Choose your year of study in 2027.');
  if(raw.contactConsent!==true)throw Error('Please agree to being contacted about your interest.');
  const programme=raw.programme??'';
  if(!PROGRAMMES.includes(programme))throw Error('Choose a programme or “Not sure yet”.');
  return {name:text(raw.name,100,'your full name'),email:contact.email,phone:contact.phone,year:raw.year,
    programme,
    modules:selections(raw.modules,MODULES,'your intended modules'),times:selections(raw.times,TIMES,'your timetable preferences'),
    notes:text(raw.notes??'',500,'up to 500 characters for your timetable notes',false),
    campaign:CAMPAIGNS.includes(raw.campaign)?raw.campaign:'direct',marketing:raw.marketing===true?1:0};
}
export async function interestRoute(request,env,url,now,helpers){
  const {json,fail,adminAllowed,smallBody,rate,formOrigin}=helpers;
  if(url.pathname==='/api/admin/interest-2027.csv'){
    if(request.method!=='GET')return fail('Method not allowed.',405);
    if(!await adminAllowed(request,env))return fail('Not authorised.',401);
    const campaign=url.searchParams.get('campaign');if(campaign&&!CAMPAIGNS.includes(campaign))return fail('Choose a valid campaign.',400);
    const keys=['name','email','phone','year','programme','modules','times','notes','first_campaign','latest_campaign','contact_consent','marketing_opt_in','privacy_version','created_at','updated_at','request_count'];
    let after='',first=true;const encoder=new TextEncoder();
    const stream=new ReadableStream({async pull(controller){try{
      if(first){controller.enqueue(encoder.encode('\uFEFF'+keys.join(',')+'\r\n'));first=false;}
      const sql='SELECT * FROM interest_leads WHERE id>?'+(campaign?' AND (first_campaign=? OR latest_campaign=?)':'')+' ORDER BY id LIMIT 500';
      const rows=await env.DB.prepare(sql).bind(...(campaign?[after,campaign,campaign]:[after])).all();
      if(rows.results.length){controller.enqueue(encoder.encode(rows.results.map(row=>keys.map(k=>csvCell(k.endsWith('_at')?new Date(row[k]*1000).toISOString():k==='programme'?(PROGRAMME_LABELS[row[k]]||''):['modules','times'].includes(k)?JSON.parse(row[k]).join('; '):row[k])).join(',')).join('\r\n')+'\r\n'));after=rows.results.at(-1).id;}
      if(rows.results.length<500)controller.close();
    }catch{controller.error(Error('Export interrupted. Please try again.'));}}});
    return new Response(stream,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="mell-interest-2027.csv"','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
  }
  if(!['/api/interest/form','/api/interest'].includes(url.pathname))return null;
  if(env.INTEREST_ENABLED!=='true')return fail('Interest registration is not open yet. Please contact MELL.',503);
  const origin=formOrigin(request,env,url);
  if(request.headers.get('Origin')!==origin)return fail('Please use the MELL form.',403);
  if(url.pathname==='/api/interest/form'){
    if(request.method!=='GET')return fail('Method not allowed.',405);
    return json({token:await sign({kind:'interest',origin,iat:now,exp:now+1800,nonce:crypto.randomUUID()},env.TOKEN_SECRET)});
  }
  if(request.method!=='POST')return fail('Method not allowed.',405);
  const raw=await smallBody(request),token=await verify(raw?.token,env.TOKEN_SECRET,'interest',now);
  if(!token||token.origin!==origin||!Number.isFinite(token.iat)||now<token.iat+1)return fail('Please reload the form and try again.',403);
  if(raw.website)return fail('Please use the MELL form.',400);
  const input=cleanInterest(raw);
  const ip=await privateHash('interest-ip:'+(request.headers.get('CF-Connecting-IP')||'local'),env.TOKEN_SECRET);
  const email=await privateHash('interest-email:'+input.email,env.TOKEN_SECRET);
  if(!await rate(env.DB,'interest-ip:'+ip,15,now)||!await rate(env.DB,'interest-email:'+email,5,now))return fail('Too many requests. Please try again in an hour.',429);
  await env.DB.prepare(`INSERT INTO interest_leads(id,name,email,phone,year,programme,modules,times,notes,first_campaign,latest_campaign,contact_consent,marketing_opt_in,privacy_version,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,1,?,?,?,?) ON CONFLICT(email) DO UPDATE SET name=excluded.name,phone=excluded.phone,year=excluded.year,programme=excluded.programme,modules=excluded.modules,times=excluded.times,notes=excluded.notes,latest_campaign=excluded.latest_campaign,contact_consent=1,marketing_opt_in=excluded.marketing_opt_in,privacy_version=excluded.privacy_version,updated_at=excluded.updated_at,request_count=request_count+1`).bind(crypto.randomUUID(),input.name,input.email,input.phone,input.year,input.programme,JSON.stringify(input.modules),JSON.stringify(input.times),input.notes,input.campaign,input.campaign,input.marketing,'interest-2027-v2',now,now).run();
  return json({ok:true,message:'Your interest is registered. MELL will contact you about February 2027 options. This does not reserve a seat.'});
}
