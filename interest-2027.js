(()=>{
  const form=document.querySelector('#interest-form');if(!form)return;
  const button=form.querySelector('button[type=submit]'),status=document.querySelector('#form-status');
  const local=['127.0.0.1','localhost'].includes(location.hostname);
  const api=local?location.origin:'https://mell-downloads.melltutors-w.workers.dev';
  const params=new URLSearchParams(location.search);
  const incoming=params.get('campaign');
  const incomingProgramme=(params.get('programme')||'').toLowerCase();
  const programme=form.elements.namedItem('programme');
  if(['premium','apex','prime','focus'].includes(incomingProgramme))programme.value=incomingProgramme;
  const campaign=['first-year-2027','second-year-2027'].includes(incoming)?incoming:'direct';
  let token='',busy=false;
  if(local){const banner=document.createElement('div');banner.className='preview-banner';banner.textContent='Private local preview · Use fictional details only. Nothing is sent to MELL’s live database.';document.body.prepend(banner);}
  function message(text,error=false){status.textContent=text;status.dataset.error=String(error);}
  async function loadToken(){
    const res=await fetch(api+'/api/interest/form',{cache:'no-store'});
    const data=await res.json();if(!res.ok)throw Error(data.error||'The form is unavailable. Please contact MELL.');token=data.token;
  }
  // Browsers omit Origin on same-origin GET; the local preview server supplies it.
  async function init(){try{await loadToken();button.disabled=false;button.textContent='Register my interest';}catch(error){button.disabled=false;button.textContent='Retry loading form';message(error.message,true);}}
  for(const name of ['modules','times'])form.querySelectorAll(`input[name="${name}"]`).forEach(input=>input.addEventListener('change',()=>{
    if(input.checked)form.querySelectorAll(`input[name="${name}"]`).forEach(other=>{if(other!==input&&(input.value==='Not sure yet'||other.value==='Not sure yet'))other.checked=false;});
  }));
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;if(!token){await init();return;}
    const data=new FormData(form),modules=data.getAll('modules'),times=data.getAll('times');
    if(!modules.length||!times.length){message('Choose your intended modules and timetable preferences, or select “Not sure yet”.',true);form.querySelector(`input[name="${!modules.length?'modules':'times'}"]`).focus();return;}
    busy=true;button.disabled=true;button.textContent='Registering…';form.setAttribute('aria-busy','true');message('');
    try{
      const res=await fetch(api+'/api/interest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,name:data.get('name'),email:data.get('email'),phone:data.get('phone'),year:data.get('year'),programme:data.get('programme'),modules,times,notes:data.get('notes'),website:data.get('website'),contactConsent:data.has('contactConsent'),marketing:data.has('marketing'),campaign})});
      const result=await res.json();if(!res.ok){if(res.status===403)await loadToken();throw Error(result.error||'Please try again shortly.');}
      form.reset();message(result.message);button.textContent='Interest registered';button.disabled=true;
      status.tabIndex=-1;status.focus();
    }catch(error){message(error.message==='Failed to fetch'?'Could not connect. Your details are still here — please try again.':error.message,true);button.disabled=false;button.textContent='Register my interest';}
    finally{busy=false;form.setAttribute('aria-busy','false');}
  });
  init();
})();
