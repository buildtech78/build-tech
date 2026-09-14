/* ==========================================================================
   BUILD.TECH — Effet de parallaxe au scroll sur la photo du hero.
   La photo se déplace plus lentement que le reste de la page (+ léger effet
   de profondeur au mouvement de la souris), pour un effet de profondeur
   discret. Désactivé si prefers-reduced-motion.
   ========================================================================== */
(function () {
  var media = document.querySelector(".pc-parallax-media");
  if (!media) return;

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  var pointerX = 0;
  var ticking = false;

  function update() {
    var offsetY = window.scrollY * 0.32;
    var offsetX = pointerX * 14;
    var rotate = Math.min(window.scrollY * 0.015, 4);
    media.style.transform = "translate3d(" + offsetX + "px," + offsetY + "px,0) rotate(" + rotate + "deg)";
    ticking = false;
  }

  function requestUpdate() {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("pointermove", function (e) {
    pointerX = (e.clientX / window.innerWidth) * 2 - 1;
    requestUpdate();
  });
  window.addEventListener("resize", requestUpdate);

  update();
})();
