/* ==========================================================================
   BUILD.TECH — Scène héro 3D : vraie tour PC (vitre + composants) qui se
   désassemble au fil du scroll. Rendu en matériaux pleins + éclairage
   (pas du fil de fer) pour un rendu produit crédible.
   Repli automatique si prefers-reduced-motion ou si WebGL indisponible.
   ========================================================================== */
(function () {
  "use strict";

  var track = document.getElementById("pcScrollTrack");
  var canvas = document.getElementById("pc-canvas");
  if (!track || !canvas) return;

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || typeof THREE === "undefined") {
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;

  var COPPER = 0xd97a44;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0.6, 0.5, 9);

  // ---- Éclairage ----
  var ambient = new THREE.AmbientLight(0x3b4250, 0.65);
  scene.add(ambient);
  var key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(3.5, 5, 4.5);
  scene.add(key);
  var fill = new THREE.DirectionalLight(0x8fb4d6, 0.35);
  fill.position.set(-4, 1, 2);
  scene.add(fill);
  var rim = new THREE.DirectionalLight(COPPER, 0.7);
  rim.position.set(-3, -1.5, -4);
  scene.add(rim);

  // ---- Ombre de contact (simple dégradé radial dessiné sur canvas) ----
  var shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 256;
  var sctx = shadowCanvas.getContext("2d");
  var grad = sctx.createRadialGradient(128, 128, 10, 128, 128, 128);
  grad.addColorStop(0, "rgba(0,0,0,0.35)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 256, 256);
  var shadowTex = new THREE.CanvasTexture(shadowCanvas);
  var shadowMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 4.2),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
  );
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = -2.05;
  scene.add(shadowMesh);

  // ---- Matériaux ----
  var caseMat = new THREE.MeshStandardMaterial({ color: 0x15181d, metalness: 0.55, roughness: 0.42 });
  var glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x9fc2e0, transparent: true, opacity: 0.2, roughness: 0.08, metalness: 0,
    clearcoat: 1, clearcoatRoughness: 0.12, side: THREE.DoubleSide, depthWrite: false
  });
  var boardMat = new THREE.MeshStandardMaterial({ color: 0x0d1a12, metalness: 0.2, roughness: 0.8 });
  var gpuBodyMat = new THREE.MeshStandardMaterial({ color: 0x1a1c20, metalness: 0.65, roughness: 0.32 });
  var accentMat = new THREE.MeshStandardMaterial({ color: COPPER, metalness: 0.35, roughness: 0.4, emissive: COPPER, emissiveIntensity: 0.55 });
  var ramMat = new THREE.MeshStandardMaterial({ color: 0x25282d, metalness: 0.5, roughness: 0.4 });
  var psuMat = new THREE.MeshStandardMaterial({ color: 0x121316, metalness: 0.5, roughness: 0.5 });
  var coolerMat = new THREE.MeshStandardMaterial({ color: 0xaab0b6, metalness: 0.75, roughness: 0.28 });
  var fanFrameMat = new THREE.MeshStandardMaterial({ color: 0x1c1e22, metalness: 0.3, roughness: 0.6 });
  var cableMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, metalness: 0.2, roughness: 0.7 });

  function buildFan(radius, withRing) {
    var g = new THREE.Group();
    var hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.22, radius * 0.22, 0.06, 16), fanFrameMat);
    hub.rotation.x = Math.PI / 2;
    g.add(hub);
    var bladeGeo = new THREE.BoxGeometry(radius * 0.8, 0.025, radius * 0.24);
    bladeGeo.translate(radius * 0.46, 0, 0);
    var bladeCount = 7;
    var blades = new THREE.Group();
    for (var i = 0; i < bladeCount; i++) {
      var blade = new THREE.Mesh(bladeGeo, fanFrameMat);
      blade.rotation.set(0.4, 0, (i / bladeCount) * Math.PI * 2);
      blades.add(blade);
    }
    g.add(blades);
    g.userData.blades = blades;
    if (withRing) {
      var ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.97, 0.022, 8, 24), accentMat);
      g.add(ring);
    }
    return g;
  }

  function buildCoolerTower() {
    var g = new THREE.Group();
    for (var i = 0; i < 5; i++) {
      var fin = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.6, 0.018), coolerMat);
      fin.position.z = -0.1 + i * 0.05;
      g.add(fin);
    }
    var fan = buildFan(0.26, true);
    fan.rotation.y = Math.PI / 2;
    fan.position.set(0, 0, 0.05);
    g.add(fan);
    g.userData.spinParts = [fan.userData.blades];
    return g;
  }

  function buildGpu() {
    var g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.3, 0.6), gpuBodyMat));
    var stripe = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.045, 0.62), accentMat);
    stripe.position.y = 0.1;
    g.add(stripe);
    var fan1 = buildFan(0.21, true); fan1.rotation.x = Math.PI / 2; fan1.position.set(-0.32, 0.16, 0);
    var fan2 = buildFan(0.21, true); fan2.rotation.x = Math.PI / 2; fan2.position.set(0.32, 0.16, 0);
    g.add(fan1, fan2);
    g.userData.spinParts = [fan1.userData.blades, fan2.userData.blades];
    return g;
  }

  function buildRam() {
    var g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 0.28), ramMat));
    var glow = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.3), accentMat);
    glow.position.y = 0.4;
    g.add(glow);
    return g;
  }

  function buildPsu() {
    var g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 1.15), psuMat));
    var fan = buildFan(0.38, true);
    fan.rotation.x = Math.PI / 2;
    fan.position.set(0, -0.31, 0);
    g.add(fan);
    g.userData.spinParts = [fan.userData.blades];
    return g;
  }

  function buildCableBundle() {
    var g = new THREE.Group();
    for (var i = 0; i < 3; i++) {
      var c = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.85, 8), cableMat);
      c.rotation.z = Math.PI / 2 + (i - 1) * 0.15;
      c.position.set(0, (i - 1) * 0.09, 0);
      g.add(c);
    }
    return g;
  }

  // ---- Assemblage ----
  var group = new THREE.Group();
  scene.add(group);

  var backPlate = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.6, 0.06), caseMat);
  backPlate.position.set(0, 0, -0.85);
  var topPlate = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.06, 1.7), caseMat);
  topPlate.position.set(0, 1.8, 0);
  var bottomPlate = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.06, 1.7), caseMat);
  bottomPlate.position.set(0, -1.8, 0);
  var leftPlate = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.6, 1.7), caseMat);
  leftPlate.position.set(-1.0, 0, 0);
  var rightPlate = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.6, 1.7), caseMat);
  rightPlate.position.set(1.0, 0, 0);
  [backPlate, topPlate, bottomPlate, leftPlate, rightPlate].forEach(function (m) { group.add(m); });

  var glassPanel = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.6, 0.05), glassMat);
  var motherboard = new THREE.Mesh(new THREE.BoxGeometry(1.7, 3.0, 0.05), boardMat);
  var gpu = buildGpu();
  var ram1 = buildRam();
  var ram2 = buildRam();
  var cooler = buildCoolerTower();
  var psu = buildPsu();
  var caseFan = buildFan(0.48, true);
  caseFan.userData.spinParts = [caseFan.userData.blades];
  var cables = buildCableBundle();

  var parts = [
    { mesh: glassPanel, a: { p: [0, 0, 0.85], r: [0, 0, 0] }, e: { p: [1.6, 0.3, 3.0], r: [0, 0.6, 0.2] }, range: [0.00, 0.22] },
    { mesh: gpu,        a: { p: [-0.15, -0.65, -0.15], r: [0, 0, 0] }, e: { p: [-0.9, -1.6, 2.3], r: [0.2, 0.35, 0.1] }, range: [0.16, 0.50], spin: true },
    { mesh: ram1,       a: { p: [0.55, 0.6, -0.35], r: [0, 0, 0] }, e: { p: [1.6, 2.0, 2.0], r: [0.25, 0, 0.15] }, range: [0.24, 0.58] },
    { mesh: ram2,       a: { p: [0.55, 0.6, 0.0], r: [0, 0, 0] }, e: { p: [2.0, 2.3, 1.6], r: [-0.2, 0, -0.1] }, range: [0.28, 0.62] },
    { mesh: cooler,     a: { p: [0.35, 0.15, -0.3], r: [0, 0, 0] }, e: { p: [1.0, 1.8, 2.4], r: [0.3, 0.4, 0] }, range: [0.32, 0.66], spin: true },
    { mesh: psu,        a: { p: [0, -1.35, -0.15], r: [0, 0, 0] }, e: { p: [0.4, -2.6, 2.0], r: [0.15, 0.15, 0] }, range: [0.38, 0.72], spin: true },
    { mesh: caseFan,    a: { p: [0, -1.0, 0.3], r: [Math.PI / 2, 0, 0] }, e: { p: [0.8, -0.55, 2.6], r: [Math.PI / 2, 0.5, 0] }, range: [0.40, 0.74], spin: true },
    { mesh: motherboard, a: { p: [0, 0, -0.6], r: [0, 0, 0] }, e: { p: [-0.3, -0.2, 1.8], r: [0, -0.3, -0.05] }, range: [0.44, 0.80] },
    { mesh: cables,     a: { p: [0.2, -1.0, -0.2], r: [0, 0, 0] }, e: { p: [0.2, -1.0, -0.2], r: [0, 0, 0] }, range: [0.5, 0.85], fadeOnly: true }
  ];

  parts.forEach(function (p) {
    p.mesh.position.set(p.a.p[0], p.a.p[1], p.a.p[2]);
    p.mesh.rotation.set(p.a.r[0], p.a.r[1], p.a.r[2]);
    if (p.fadeOnly) {
      p.mesh.traverse(function (o) { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0; } });
    }
    group.add(p.mesh);
  });

  group.scale.setScalar(0.92);
  group.position.y = -0.1;

  function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
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

  window.addEventListener("buildtech:themechange", function (e) {
    ambient.intensity = e.detail.theme === "dark" ? 0.55 : 0.75;
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
      t = easeInOutCubic(Math.min(Math.max(t, 0), 1));

      if (p.fadeOnly) {
        p.mesh.traverse(function (o) { if (o.material) o.material.opacity = t * 0.85; });
        return;
      }

      p.mesh.position.set(lerp(p.a.p[0], p.e.p[0], t), lerp(p.a.p[1], p.e.p[1], t), lerp(p.a.p[2], p.e.p[2], t));
      p.mesh.rotation.set(
        lerp(p.a.r[0], p.e.r[0], t) + (p.spin ? elapsed * 0.5 : 0),
        lerp(p.a.r[1], p.e.r[1], t),
        lerp(p.a.r[2], p.e.r[2], t)
      );
      if (p.spin && p.mesh.userData.spinParts) {
        p.mesh.userData.spinParts.forEach(function (blades) { blades.rotation.z = elapsed * 3.2; });
      }
    });

    group.rotation.y = Math.sin(elapsed * 0.12) * 0.16 + progress * 0.35;
    camera.position.x = 0.6 + pointer.x * 0.3;
    camera.position.y = 0.5 - pointer.y * 0.18;
    camera.lookAt(0, -0.1, 0);

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && visible) requestAnimationFrame(tick);
  });
})();
