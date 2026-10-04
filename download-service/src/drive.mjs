import {b64url,unb64} from './core.mjs';
let cached;
export async function driveFile(fileId,credential,fetcher=fetch){
  const account=JSON.parse(credential||'{}');
  if(!account.client_email||!account.private_key||!/^[-\w]{15,100}$/.test(fileId))throw Error('Drive configuration incomplete');
  const now=Math.floor(Date.now()/1000);
  if(!cached||cached.email!==account.client_email||cached.exp<now+60){
    const enc=new TextEncoder();
    const header=b64url(enc.encode(JSON.stringify({alg:'RS256',typ:'JWT'})));
    const payload=b64url(enc.encode(JSON.stringify({iss:account.client_email,scope:'https://www.googleapis.com/auth/drive.readonly',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600})));
    const key=await crypto.subtle.importKey('pkcs8',unb64(account.private_key.replace(/-----[^-]+-----|\s/g,'')),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
    const body=header+'.'+payload;
    const assertion=body+'.'+b64url(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,enc.encode(body)));
    const res=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),signal:AbortSignal.timeout(15000)});
    if(!res.ok)throw Error('Drive authentication unavailable');
    const token=await res.json();if(!token.access_token)throw Error('Drive authentication unavailable');
    cached={email:account.client_email,token:token.access_token,exp:now+Math.min(token.expires_in||3600,3600)};
  }
  const res=await fetcher('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(fileId)+'?alt=media',{headers:{Authorization:'Bearer '+cached.token},redirect:'error',signal:AbortSignal.timeout(30000)});
  if(!res.ok||!res.headers.get('content-type')?.includes('application/pdf'))throw Error('PDF unavailable');
  return res;
}
