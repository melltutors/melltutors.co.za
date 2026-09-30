(() => {
 'use strict';
 const header=document.querySelector('.site-header'),toggle=document.querySelector('.menu-toggle'),nav=document.querySelector('#site-nav');
 const setMenu=open=>{toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Close menu':'Open menu');nav.classList.toggle('is-open',open);header.classList.toggle('menu-open',open);};
 toggle.addEventListener('click',()=>setMenu(toggle.getAttribute('aria-expanded')!=='true'));
 nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){setMenu(false);toggle.focus();}});
 document.addEventListener('click',e=>{if(!header.contains(e.target))setMenu(false);});
 const updateHeader=()=>header.classList.toggle('is-scrolled',scrollY>24);
 addEventListener('scroll',updateHeader,{passive:true});updateHeader();
 new ResizeObserver(()=>document.documentElement.style.setProperty('--header-h',header.offsetHeight+'px')).observe(header);
 matchMedia('(min-width:901px)').addEventListener('change',()=>setMenu(false));
 document.querySelector('#year').textContent=new Date().getFullYear();
 const filters=[...document.querySelectorAll('[data-filter]')];
 if(filters.length){
  const applyFilter=choice=>{
   if(!['all','math1048','math1049'].includes(choice))choice='all';
   filters.forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.filter===choice)));
   document.querySelectorAll('[data-course]').forEach(el=>el.hidden=choice!=='all'&&el.dataset.course!==choice);
   document.querySelector('#filter-status').textContent=choice==='all'?'Showing all four playbooks.':'Showing two '+choice.toUpperCase()+' playbooks.';
  };
  filters.forEach(el=>el.addEventListener('click',()=>{const choice=el.dataset.filter;applyFilter(choice);history.replaceState(null,'',choice==='all'?'#catalogue':'#'+choice);}));
  const fromHash=()=>{const h=location.hash.slice(1).toLowerCase();applyFilter(['math1048','math1049'].includes(h)?h:'all');};
  fromHash();addEventListener('hashchange',fromHash);
 }
 document.querySelectorAll('.review-carousel').forEach(carousel=>{
  const viewport=carousel.querySelector('.review-viewport'),track=carousel.querySelector('.reviews-track'),cards=[...track.children];
  if(cards.length<2)return;
  const motion=carousel.querySelector('.motion-toggle'),status=carousel.querySelector('[role="status"]'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
  // Clones provide a seamless visual loop; original cards remain the keyboard/screen-reader content.
  const clone=card=>{const el=card.cloneNode(true);el.dataset.clone='true';el.setAttribute('aria-hidden','true');el.querySelectorAll('a,button').forEach(a=>a.tabIndex=-1);return el;};
  track.prepend(...cards.map(clone));track.append(...cards.map(clone));
  let cycle=0,step=0,paused=false,focused=false,visible=false,dragging=false,inside=false,direction=1,last=0,frame=0,measureFrame=0,carry=0;
  const normalise=()=>{if(cycle){while(viewport.scrollLeft<cycle)viewport.scrollLeft+=cycle;while(viewport.scrollLeft>=2*cycle)viewport.scrollLeft-=cycle;}};
  const measure=()=>{const oldCycle=cycle,phase=oldCycle?((viewport.scrollLeft-oldCycle)%oldCycle+oldCycle)%oldCycle/oldCycle:0;step=cards[1].offsetLeft-cards[0].offsetLeft;cycle=step*cards.length;viewport.scrollLeft=cycle+phase*cycle;};
  const running=()=>visible&&!paused&&!focused&&!dragging&&!document.hidden&&!reduced.matches&&(!inside||direction!==0);
  const animate=time=>{
   if(!running()){frame=0;last=0;return;}
   const seconds=last?Math.min((time-last)/1000,.05):0;last=time;
   carry+=(inside?direction*135:48)*seconds;
   const pixels=Math.trunc(carry);if(pixels){viewport.scrollLeft+=pixels;carry-=pixels;normalise();}
   frame=requestAnimationFrame(animate);
  };
  const sync=()=>{
   motion.disabled=reduced.matches;
   motion.setAttribute('aria-pressed',String(paused||reduced.matches));
   motion.innerHTML=reduced.matches?'Motion off <span aria-hidden="true">Ⅱ</span>':paused?'Play movement <span aria-hidden="true">▷</span>':'Pause movement <span aria-hidden="true">Ⅱ</span>';
   motion.title=reduced.matches?'Your device prefers reduced motion. You can still use the arrows or swipe.':'';
   if(running()){if(!frame){last=0;frame=requestAnimationFrame(animate);}}else{cancelAnimationFrame(frame);frame=0;last=0;}
  };
  const move=dir=>{paused=true;viewport.scrollLeft+=dir*step;normalise();if(status){const index=Math.round((viewport.scrollLeft-cycle)/step)%cards.length;status.textContent='Reviews starting with '+cards[index].querySelector('figcaption strong').textContent+'.';}sync();};
  carousel.querySelector('.review-prev').addEventListener('click',()=>move(-1));
  carousel.querySelector('.review-next').addEventListener('click',()=>move(1));
  motion.addEventListener('click',e=>{paused=!paused;if(e.detail>0){motion.blur();focused=false;}sync();});
  viewport.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){inside=true;direction=0;sync();}});
  viewport.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;const r=viewport.getBoundingClientRect(),fraction=(e.clientX-r.left)/r.width;inside=true;direction=fraction<.22?-1:fraction>.78?1:0;sync();});
  viewport.addEventListener('pointerleave',()=>{inside=false;direction=1;sync();});
  carousel.addEventListener('focusin',()=>{focused=true;sync();});
  carousel.addEventListener('focusout',()=>setTimeout(()=>{focused=carousel.contains(document.activeElement);sync();},0));
  viewport.addEventListener('pointerdown',()=>{dragging=true;sync();});
  addEventListener('pointerup',()=>{if(dragging){dragging=false;paused=true;sync();}});
  addEventListener('pointercancel',()=>{dragging=false;sync();});
  viewport.addEventListener('scroll',()=>{if(!dragging)normalise();},{passive:true});
  viewport.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();move(e.key==='ArrowLeft'?-1:1);}});
  new ResizeObserver(()=>{cancelAnimationFrame(measureFrame);measureFrame=requestAnimationFrame(measure);}).observe(viewport);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:.15}).observe(carousel);
  reduced.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);
  measure();sync();
 });
})();
