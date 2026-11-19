(() => {
 const hero = document.querySelector(".careers-hero");
 const video = hero?.querySelector(".careers-hero-video");
 const control = hero?.querySelector(".careers-hero-motion");
 if (!video || !control || !video.canPlayType("video/mp4")) return;

 const motion = matchMedia("(prefers-reduced-motion: reduce)");
 let visible = false;
 let wantsPlayback = !motion.matches && !navigator.connection?.saveData;

 function updateControl() {
  control.textContent = video.paused ? "Play video" : "Pause video";
 }

 function updatePlayback() {
  if (!visible || !wantsPlayback) {
   video.pause();
   updateControl();
   return;
  }

  if (!video.hasAttribute("src")) video.src = video.dataset.src;
  video.play().catch(error => {
   if (error.name !== "AbortError") {
    wantsPlayback = false;
    updateControl();
   }
  });
 }

 video.addEventListener("playing", () => {
  video.classList.add("has-frame");
  updateControl();
 });
 video.addEventListener("pause", updateControl);
 video.addEventListener("error", () => {
  video.classList.remove("has-frame");
  control.hidden = true;
 });
 control.addEventListener("click", () => {
  wantsPlayback = video.paused;
  updatePlayback();
 });
 motion.addEventListener("change", event => {
  if (event.matches) {
   wantsPlayback = false;
   updatePlayback();
  }
 });

 control.hidden = false;
 if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(([entry]) => {
   visible = entry.isIntersecting && entry.intersectionRatio >= 0.15;
   updatePlayback();
  }, { threshold: 0.15 });
  observer.observe(hero);
 } else {
  visible = true;
  updatePlayback();
 }
})();
