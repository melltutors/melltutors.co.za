  var yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();
  /* Current block name: edit the start dates below (year, month 0-11, day) to change when each block goes live. */
  (function(){
    var el = document.getElementById('block-name');
    if(!el) return;
    var blocks = [
      { start: new Date(2026, 1, 1),  name: 'MELL Early Birds' },
      { start: new Date(2026, 3, 6),  name: 'MELL Momentum' },
      { start: new Date(2026, 7, 3),  name: 'MELL Countdown' },
      { start: new Date(2026, 8, 14), name: 'MELL The Last Lock-in' }
    ];
    var now = new Date(), name = blocks[0].name;
    for(var i = 0; i < blocks.length; i++){ if(now >= blocks[i].start) name = blocks[i].name; }
    el.textContent = name;
  })();
  (function(){
    var h=document.querySelector('header');
    if(!h) return;
    var b=h.querySelector('.menu-btn');
    function set(o){ h.classList.toggle('menu-open',o); b.setAttribute('aria-expanded',o); b.setAttribute('aria-label',o?'Close menu':'Open menu'); b.textContent=o?'✕':'☰'; }
    b.addEventListener('click',function(){ set(!h.classList.contains('menu-open')); });
    h.querySelectorAll('.mobile-menu a').forEach(function(a){ a.addEventListener('click',function(){ set(false); }); });
    document.addEventListener('keydown',function(e){ if(e.key==='Escape') set(false); });
    window.addEventListener('resize',function(){ if(window.innerWidth>900) set(false); });
  })();
  (function(){
    var h = document.querySelector('header');
    if(!h) return;
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
      h.classList.toggle('scrolled', window.scrollY > 8);
    }
    t(); window.addEventListener('scroll', t, {passive:true}); window.addEventListener('resize', t);
  })();
  (function(){
    var nav = document.querySelector('.mell-landing nav');
    if(!nav) return;
    function onScroll(){ nav.classList.toggle('nav-scrolled', window.scrollY > 8); }
    onScroll();
    window.addEventListener('scroll', onScroll, {passive:true});
    function setH(){ document.documentElement.style.setProperty('--nav-h', nav.offsetHeight + 'px'); }
    setH();
    window.addEventListener('resize', setH);
    window.addEventListener('load', setH);
  })();
  (function(){
    var layers = document.querySelectorAll('.mell-landing .hero-bg');
    var current = 0;
    // Fetch hidden slides once the visible page has loaded, before the first transition.
    function loadHiddenSlides(){
      layers.forEach(function(layer){
        var url = layer.getAttribute('data-bg');
        if (!url) return;
        var image = new Image();
        image.onload = function(){
          layer.style.backgroundImage = 'url("' + url + '")';
          layer.removeAttribute('data-bg');
        };
        image.src = url;
      });
    }
    if (document.readyState === 'complete') loadHiddenSlides();
    else window.addEventListener('load', loadHiddenSlides, {once:true});
    if (layers.length > 1) {
      setInterval(function(){
        var prev = layers[current];
        layers.forEach(function(l){ l.classList.remove('prev'); });
        prev.classList.remove('active');
        prev.classList.add('prev');
        current = (current + 1) % layers.length;
        layers[current].classList.add('active');
        setTimeout(function(){ prev.classList.remove('prev'); }, 2800);
      }, 9500);
    }
  })();
  (function(){
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function initCarousel(root){
      var track = root.querySelector('.g-track');
      var viewport = root.querySelector('.g-viewport');
      var dotsEl = root.querySelector('.g-dots');
      var originals = Array.prototype.slice.call(track.children);
      var n = originals.length;
      var per = 3, pos = 0, timer = null, hovering = false, edgeT = null, edgeDir = 0, wrapT = null, clones = [];

      function perView(){ var w = window.innerWidth; return w <= 680 ? 1 : (w <= 1000 ? 2 : 3); }
      function step(){
        var cs = getComputedStyle(track);
        var gap = parseFloat(cs.columnGap || cs.gap) || 28;
        return originals[0].getBoundingClientRect().width + gap;
      }
      function move(anim){
        track.classList.toggle('no-anim', !anim || reduce);
        track.style.transform = 'translateX(' + (-pos * step()) + 'px)';
        var on = ((pos % n) + n) % n;
        Array.prototype.forEach.call(dotsEl.children, function(d, i){ d.classList.toggle('on', i === on); });
      }
      function settle(){
        clearTimeout(wrapT); wrapT = null;
        if(pos >= n){ pos -= n; move(false); void track.offsetWidth; }
      }
      function go(dir){
        if(n <= per) return;
        settle();
        if(dir > 0){
          pos += 1; move(true);
          if(pos >= n){ wrapT = setTimeout(settle, 1000); }
        } else {
          if(pos <= 0){ pos = n; move(false); void track.offsetWidth; }
          pos -= 1; move(true);
        }
      }
      function words(){
        var m = 0;
        for(var i = 0; i < per; i++){
          var t = originals[(pos + i) % n].querySelector('.g-text');
          var w = t ? t.textContent.trim().split(/\s+/).length : 0;
          if(w > m) m = w;
        }
        return m;
      }
      function dwell(){ return Math.min(4800, Math.max(3200, 1800 + words() * 35)); }

      /* auto-rotate: runs whenever the pointer is NOT over the widget */
      function stopAuto(){ clearTimeout(timer); timer = null; }
      function schedule(){
        stopAuto();
        if(hovering || n <= per || document.hidden) return;
        timer = setTimeout(function(){ go(1); schedule(); }, dwell());
      }

      /* edge hover: left/right ~22% of the cards scrolls that way; the middle pauses */
      function stopEdge(){ clearInterval(edgeT); edgeT = null; edgeDir = 0; viewport.classList.remove('edge-left','edge-right'); }
      function setEdge(dir){
        if(dir === edgeDir) return;
        stopEdge();
        if(!dir) return;
        edgeDir = dir;
        viewport.classList.add(dir < 0 ? 'edge-left' : 'edge-right');
        go(dir);
        edgeT = setInterval(function(){ go(dir); }, 1100);
      }

      function build(){
        clones.forEach(function(c){ c.remove(); }); clones = [];
        per = perView();
        var sliding = n > per;
        root.classList.toggle('static', !sliding);
        dotsEl.innerHTML = '';
        if(!sliding){ pos = 0; move(false); stopAuto(); stopEdge(); return; }
        for(var i = 0; i < per; i++){
          var c = originals[i].cloneNode(true);
          c.setAttribute('aria-hidden', 'true'); c.setAttribute('tabindex', '-1');
          track.appendChild(c); clones.push(c);
        }
        for(var k = 0; k < n; k++){ var d = document.createElement('span'); d.className = 'g-dot'; dotsEl.appendChild(d); }
        pos = pos % n; move(false); schedule();
      }

      root.querySelector('.g-next').addEventListener('click', function(){ go(1); schedule(); });
      root.querySelector('.g-prev').addEventListener('click', function(){ go(-1); schedule(); });

      root.addEventListener('pointerenter', function(e){ if(e.pointerType === 'mouse'){ hovering = true; stopAuto(); } });
      root.addEventListener('pointerleave', function(e){ if(e.pointerType === 'mouse'){ hovering = false; stopEdge(); schedule(); } });
      viewport.addEventListener('pointermove', function(e){
        if(e.pointerType !== 'mouse') return;
        var r = viewport.getBoundingClientRect(), f = (e.clientX - r.left) / r.width;
        setEdge(f < 0.22 ? -1 : (f > 0.78 ? 1 : 0));
      });
      root.querySelector('.g-controls').addEventListener('pointerenter', stopEdge);

      /* touch: swipe */
      var x0 = null;
      root.addEventListener('touchstart', function(e){ x0 = e.touches[0].clientX; stopAuto(); }, {passive:true});
      root.addEventListener('touchend', function(e){
        if(x0 !== null){ var dx = e.changedTouches[0].clientX - x0; if(Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); }
        x0 = null; schedule();
      }, {passive:true});

      document.addEventListener('visibilitychange', function(){ if(document.hidden) stopAuto(); else schedule(); });
      var rt; window.addEventListener('resize', function(){ clearTimeout(rt); rt = setTimeout(build, 150); });
      build();
    }

    Array.prototype.forEach.call(document.querySelectorAll('.g-carousel'), initCarousel);
  })();
