(() => {
 'use strict';
 if(location.pathname.endsWith('/math1049a.html')&&['#algebra','#calculus','#bundle','#hardcopies'].includes(location.hash)){
  location.replace('math1049a-'+(location.hash==='#hardcopies'?'bundle':location.hash.slice(1))+'.html');return;
 }
 const forms=[...document.querySelectorAll('[data-request-form]')];
 if(!forms.length)return;
 const api=['melltutors.co.za','www.melltutors.co.za'].includes(location.hostname)?'https://mell-downloads.melltutors-w.workers.dev':location.origin;
 const credentials=api===location.origin?'same-origin':'omit';
 const getToken=async()=>{const response=await fetch(api+'/api/form',{credentials,cache:'no-store'});if(!response.ok)throw Error('Downloads are temporarily unavailable. Please try again shortly.');return(await response.json()).token;};
 const makeLink=(text,url,classes='button primary')=>{const a=document.createElement('a');a.textContent=text;a.href=url;a.className=classes;return a;};
 for(const form of forms){
  let tokenPromise=getToken().catch(()=>null);
  form.addEventListener('submit',async e=>{
   e.preventDefault();const button=form.querySelector('[type="submit"]'),status=form.querySelector('.form-status'),result=form.querySelector('.form-result');
   if(button.disabled)return;
   button.disabled=true;button.setAttribute('aria-busy','true');status.textContent='Preparing your request…';result.hidden=true;
   try{
    const fields=new FormData(form),token=await tokenPromise;
    if(!token){tokenPromise=getToken().catch(()=>null);throw Error('The form could not connect. Please try again.');}
    const response=await fetch(api+'/api/requests',{method:'POST',headers:{'Content-Type':'application/json'},credentials,body:JSON.stringify({token,course:form.dataset.course,intent:form.dataset.intent,email:fields.get('email'),phone:fields.get('phone'),product:fields.get('product'),website:fields.get('website'),marketing:fields.get('marketing')==='on'})});
    const data=await response.json();if(!response.ok){if(response.status===403)tokenPromise=getToken().catch(()=>null);throw Error(data.error||'Please try again shortly.');}
    result.replaceChildren();
    if(data.intent==='free'){
     const title=document.createElement('h4');title.textContent='Your pair is ready.';result.append(title);
     const text=document.createElement('p');text.textContent='Save both PDFs. These links work for two hours.';result.append(text);
     const actions=document.createElement('div');actions.className='download-actions';
     for(const item of data.downloads){const a=makeLink('Download '+item.subject[0].toUpperCase()+item.subject.slice(1),new URL(item.url,api).href);a.download=item.name;actions.append(a);}result.append(actions);
     if(data.course==='MATH1049A'){const upsell=document.createElement('p');upsell.className='download-upsell';upsell.textContent='Want every solution for Block 4? ';upsell.append(makeLink('Both hardcopies · R600. Save R200.','math1049a-bundle.html','text-link'));result.append(upsell);}
    }else{
     const p=document.createElement('p');p.textContent='Your email is saved. Open your chosen hardcopy in WhatsApp to arrange EFT payment and delivery.';result.append(p);
     const a=makeLink('Open '+(data.product==='bundle'?'the R600 bundle':data.product+' · R400')+' on WhatsApp',data.url);a.target='_blank';a.rel='noopener noreferrer';result.append(a);
    }
    status.textContent='';result.hidden=false;result.focus();
   }catch(error){status.textContent=error.message||'Something went wrong. Please try again.';}
   finally{button.disabled=false;button.removeAttribute('aria-busy');}
  });
 }
 const productForm=forms.find(f=>f.dataset.intent==='hardcopy');
 if(productForm){
  const radios=[...document.querySelectorAll('[name="hardcopy-choice"]')],nudge=document.querySelector('[data-bundle-nudge]');
  const choose=value=>{if(!radios.some(r=>r.value===value))return;radios.forEach(r=>r.checked=r.value===value);productForm.querySelector('[name="product"]').value=value;if(nudge)nudge.hidden=value==='bundle';productForm.querySelector('.form-result').hidden=true;};
  radios.forEach(r=>r.addEventListener('change',()=>choose(r.value)));
  document.querySelector('[data-select-bundle]')?.addEventListener('click',()=>choose('bundle'));
  const fromHash=()=>choose(location.hash.slice(1));fromHash();addEventListener('hashchange',fromHash);
 }
})();
