const encoder=new TextEncoder();
export const CATALOGUE={
  algebra:'https://wa.me/p/29008905788694857/27660136689',
  calculus:'https://wa.me/p/28618136277823805/27660136689',
  bundle:'https://wa.me/p/27981764794858192/27660136689'
};
export const COURSES={
  MATH1048A:{title:'MATH1048A',scope:'Block 2',subjects:['algebra','calculus']},
  MATH1049A:{title:'MATH1049A',scope:'Semester 2',subjects:['algebra','calculus']}
};
export function cleanInput(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Please complete the form.');
  const email=typeof input.email==='string'?input.email.trim().toLowerCase():'';
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||/[\x00-\x1f\x7f]/.test(email))throw Error('Enter a valid email address.');
  const course=input.course;if(!Object.hasOwn(COURSES,course))throw Error('Choose your course.');
  const intent=input.intent||'free';if(!['free','hardcopy'].includes(intent))throw Error('Choose a valid request.');
  let phone=null,product='both';
  if(intent==='free'){
    if(typeof input.phone!=='string'||input.phone.length>35||!/^[+\d\s()-]+$/.test(input.phone))throw Error('Enter your phone number.');
    phone=input.phone.replace(/[\s()-]/g,'');
    if(/^0\d{9}$/.test(phone))phone='+27'+phone.slice(1);
    if(/^27\d{9}$/.test(phone))phone='+'+phone;
    if(!/^\+[1-9]\d{7,14}$/.test(phone))throw Error('Use a South African mobile number or an international number starting with +.');
  }else{
    product=input.product;
    if(course!=='MATH1049A'||!Object.hasOwn(CATALOGUE,product))throw Error('That hardcopy is not available.');
  }
  return{email,phone,course,intent,product,marketing:input.marketing===true?1:0};
}
export const b64url=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
export const unb64=value=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
async function hmacKey(secret){if(!secret||secret.length<32)throw Error('Service configuration incomplete');return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function sign(value,secret){const body=b64url(encoder.encode(JSON.stringify(value)));return body+'.'+b64url(await crypto.subtle.sign('HMAC',await hmacKey(secret),encoder.encode(body)));}
export async function verify(token,secret,kind,now=Math.floor(Date.now()/1000)){
  try{if(typeof token!=='string'||token.length>2048)return null;const [body,signature,...rest]=token.split('.');if(rest.length||!body||!signature)return null;
    if(!await crypto.subtle.verify('HMAC',await hmacKey(secret),unb64(signature),encoder.encode(body)))return null;
    const data=JSON.parse(new TextDecoder().decode(unb64(body)));return data.kind===kind&&Number.isFinite(data.exp)&&data.exp>now?data:null;
  }catch{return null;}
}
export async function privateHash(value,secret){return b64url(await crypto.subtle.sign('HMAC',await hmacKey(secret),encoder.encode(value)));}
export async function secretMatches(a,b){if(!a||!b||a.length>512)return false;const [x,y]=await Promise.all([a,b].map(v=>crypto.subtle.digest('SHA-256',encoder.encode(v))));let d=0;const ax=new Uint8Array(x),by=new Uint8Array(y);for(let i=0;i<ax.length;i++)d|=ax[i]^by[i];return d===0;}
export function csvCell(value){let s=value==null?'':String(value);if(/^[\s]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
export function downloadName(course,subject){return 'MELL-'+course+'-'+subject[0].toUpperCase()+subject.slice(1)+'-'+(course==='MATH1048A'?'Block-2':'Semester-2')+'-Free.pdf';}
