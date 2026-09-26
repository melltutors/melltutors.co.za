  document.getElementById('year').textContent = new Date().getFullYear();
  (function(){
    var h=document.querySelector('header'), b=h.querySelector('.menu-btn');
    function set(o){ h.classList.toggle('menu-open',o); b.setAttribute('aria-expanded',o); b.setAttribute('aria-label',o?'Close menu':'Open menu'); b.textContent=o?'✕':'☰'; }
    b.addEventListener('click',function(){ set(!h.classList.contains('menu-open')); });
    h.querySelectorAll('.mobile-menu a').forEach(function(a){ a.addEventListener('click',function(){ set(false); }); });
    document.addEventListener('keydown',function(e){ if(e.key==='Escape') set(false); });
    window.addEventListener('resize',function(){ if(window.innerWidth>900) set(false); });
  })();
  (function(){
    var h = document.querySelector('header');
    function lum(c){ var m=c.match(/[\d.]+/g); if(!m) return 1; return (0.2126*m[0]+0.7152*m[1]+0.0722*m[2])/255; }
    function dark(el){
      if(el.closest('.falcon-band, .marquee, section.dark')) return true;
      for(var e=el; e && e!==document.documentElement; e=e.parentElement){
        var c=getComputedStyle(e).backgroundColor, m=c.match(/[\d.]+/g);
        if(m && (m.length<4 || parseFloat(m[3])>0.5)) return lum(c)<0.45;
      }
      return false;
    }
    function t(){
      var y=h.offsetHeight/2, els=document.elementsFromPoint(window.innerWidth/2, y), el=null;
      for(var i=0;i<els.length;i++){ if(!h.contains(els[i])){ el=els[i]; break; } }
      h.classList.toggle('on-dark', el ? dark(el) : true);
    }
    t(); window.addEventListener('scroll', t, {passive:true}); window.addEventListener('resize', t);
  })();
