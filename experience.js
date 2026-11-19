(() => {
 const gallery = document.getElementById('xp-photos');
 if (!gallery) return;

 const controls = document.querySelector('.xp-gallery-buttons');
 const [previous, next] = controls.querySelectorAll('button');
 const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

 function updateControls() {
  const maxScroll = gallery.scrollWidth - gallery.clientWidth;
  previous.disabled = gallery.scrollLeft <= 1;
  next.disabled = gallery.scrollLeft >= maxScroll - 1;
 }

 controls.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-direction]');
  if (!button) return;

  const [first, second] = gallery.children;
  const step = second.offsetLeft - first.offsetLeft;
  gallery.scrollBy({
   left: step * Number(button.dataset.direction),
   behavior: reducedMotion.matches ? 'instant' : 'smooth',
  });
 });

 gallery.addEventListener('scroll', updateControls, { passive: true });
 window.addEventListener('resize', updateControls);
 updateControls();
 controls.hidden = false;
})();
