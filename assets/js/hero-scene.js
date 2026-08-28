/* ==========================================================================
   BUILD.TECH — Scène héro 3D : vue éclatée d'une tour PC en fil de fer.
   Plus l'utilisateur défile dans le bloc `#pcScrollTrack`, plus les pièces
   (façade, carte mère, GPU, RAM, alim, ventirad) se séparent du châssis.
   Repli automatique si prefers-reduced-motion ou si WebGL indisponible.
   ========================================================================== */
(function () {
  "use strict";

  var track = document.getElementById("pcScrollTrack");
  var canvas = document.getElementById("pc-canvas");
  if (!track || !canvas) return;

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    track.classList.add("static-hero");
    return;
  }

  if (typeof THREE === "undefined") {
    track.classList.add("static-hero");
    return;
  }

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  } catch (e) {
    track.classList.add("static-hero");
    return;
  }

  var PALETTES = {
    light: { frame: 0x9fb4c8, part: 0x1e4b79, accent: 0xc1652f },
    dark: { frame: 0x2b4256, part: 0x5c93c9, accent: 0xe58a52 }
  };
  function currentPalette() {
    var t = document.documentElement.getAttribute("data-theme");
    return PALETTES[t === "dark" ? "dark" : "light"];
  }

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0.4, 9);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  var group = new THREE.Group();
  scene.add(group);

  function lineMesh(geometry, colorHex) {
    var edges = new THREE.EdgesGeometry(geometry);
    var mat = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.95 });
    return new THREE.LineSegments(edges, mat);
  }

  function fanMesh(radius, colorHex) {
    var g = new THREE.Group();
    var ring = lineMesh(new THREE.CylinderGeometry(radius, radius, 0.04, 20), colorHex);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
    for (var i = 0; i < 4; i++) {
      var blade = lineMesh(new THREE.BoxGeometry(radius * 1.7, 0.02, 0.32), colorHex);
      blade.rotation.z = (Math.PI / 4) + (i * Math.PI) / 2;
      g.add(blade);
    }
    return g;
  }

  var pal = currentPalette();

  // Châssis (reste globalement en place — c'est le repère visuel)
  var caseFrame = lineMesh(new THREE.BoxGeometry(2.0, 3.7, 1.7), pal.frame);

  // Panneau latéral (part en premier)
  var sidePanel = lineMesh(new THREE.BoxGeometry(0.04, 3.5, 1.6), pal.part);

  // Carte mère
  var motherboard = lineMesh(new THREE.BoxGeometry(0.05, 3.0, 1.3), pal.part);

  // Carte graphique (pièce mise en avant → couleur accent)
  var gpu = lineMesh(new THREE.BoxGeometry(1.3, 0.28, 0.55), pal.accent);

  // RAM (deux barrettes)
  var ram1 = lineMesh(new THREE.BoxGeometry(0.06, 0.9, 0.28), pal.part);
  var ram2 = lineMesh(new THREE.BoxGeometry(0.06, 0.9, 0.28), pal.part);

  // Alimentation
  var psu = lineMesh(new THREE.BoxGeometry(1.5, 0.7, 1.3), pal.part);

  // Ventirad CPU
  var cooler = fanMesh(0.5, pal.part);

  // Ventilateur façade
  var frontFan = fanMesh(0.55, pal.part);

  var parts = [
    // name, mesh, assembled{pos,rot}, exploded{pos,rot}, range[start,end], spin(bool)
    { mesh: sidePanel,    a: { p: [0.98, 0, 0],      r: [0, 0, 0] },          e: { p: [3.1, 0.3, -0.4],   r: [0, 0.5, 0.15] },  range: [0.00, 0.28] },
    { mesh: motherboard,  a: { p: [-0.75, 0, 0],     r: [0, 0, 0] },          e: { p: [-3.3, -0.2, 0.6],  r: [0, -0.35, -0.1] }, range: [0.12, 0.5] },
    { mesh: gpu,          a: { p: [-0.35, -0.55, 0], r: [0, 0, 0] },         e: { p: [-1.1, -1.9, 2.6],  r: [0.25, 0.4, 0.1] },  range: [0.22, 0.58] },
    { mesh: ram1,         a: { p: [-0.55, 0.85, -0.25], r: [0, 0, 0] },      e: { p: [-2.0, 2.4, -0.6],  r: [0.3, 0, 0.2] },     range: [0.3, 0.64] },
    { mesh: ram2,         a: { p: [-0.55, 0.85, 0.25], r: [0, 0, 0] },       e: { p: [-2.6, 2.7, 0.9],   r: [-0.2, 0, -0.15] },  range: [0.34, 0.68] },
    { mesh: psu,          a: { p: [0, -1.35, 0],      r: [0, 0, 0] },        e: { p: [0.4, -3.1, -1.6],  r: [0.15, 0.2, 0] },    range: [0.36, 0.7] },
    { mesh: cooler,       a: { p: [-0.35, 0.2, 0],    r: [0, 0, 0] },        e: { p: [-1.0, 2.0, 2.2],   r: [0.4, 0.5, 0] },     range: [0.42, 0.78], spin: true },
    { mesh: frontFan,     a: { p: [0, 0.4, 0.9],      r: [Math.PI / 2, 0, 0] }, e: { p: [0.6, 0.9, 3.4], r: [Math.PI / 2, 0.6, 0] }, range: [0.48, 0.85], spin: true }
  ];

  group.add(caseFrame);
  parts.forEach(function (p) {
    p.mesh.position.set(p.a.p[0], p.a.p[1], p.a.p[2]);
    p.mesh.rotation.set(p.a.r[0], p.a.r[1], p.a.r[2]);
    group.add(p.mesh);
  });

  group.scale.setScalar(0.92);

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function resize() {
    var w = track.clientWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  var visible = false;
  var io = new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    if (visible) requestAnimationFrame(tick);
  }, { threshold: 0 });
  io.observe(track);

  var pointer = { x: 0, y: 0 };
  window.addEventListener("pointermove", function (e) {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  window.addEventListener("buildtech:themechange", function () {
    pal = currentPalette();
    caseFrame.material.color.setHex(pal.frame);
    parts.forEach(function (p) {
      var isAccent = p.mesh === gpu;
      p.mesh.traverse(function (obj) {
        if (obj.material) obj.material.color.setHex(isAccent ? pal.accent : pal.part);
      });
    });
  });

  var clock = new THREE.Clock();

  function tick() {
    if (!visible) return;
    var elapsed = clock.getElapsedTime();

    var rect = track.getBoundingClientRect();
    var total = track.offsetHeight - window.innerHeight;
    var scrolled = -rect.top;
    var progress = total > 0 ? Math.min(Math.max(scrolled / total, 0), 1) : 0;

    parts.forEach(function (p) {
      var t = (progress - p.range[0]) / (p.range[1] - p.range[0]);
      t = Math.min(Math.max(t, 0), 1);
      t = easeInOutCubic(t);
      p.mesh.position.set(
        lerp(p.a.p[0], p.e.p[0], t),
        lerp(p.a.p[1], p.e.p[1], t),
        lerp(p.a.p[2], p.e.p[2], t)
      );
      p.mesh.rotation.set(
        lerp(p.a.r[0], p.e.r[0], t) + (p.spin ? elapsed * 0.6 : 0),
        lerp(p.a.r[1], p.e.r[1], t),
        lerp(p.a.r[2], p.e.r[2], t)
      );
      p.mesh.material && (p.mesh.material.opacity = 0.35 + t * 0.65 + (1 - t) * 0.6);
    });

    group.rotation.y = Math.sin(elapsed * 0.15) * 0.18 + progress * 0.5;
    camera.position.x = pointer.x * 0.35;
    camera.position.y = 0.4 - pointer.y * 0.2;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && visible) requestAnimationFrame(tick);
  });
})();
