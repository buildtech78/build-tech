/* ==========================================================================
   BUILD.TECH — Barre de navigation : état de connexion, menu mobile, profil
   ========================================================================== */
(function () {
  function renderAuthArea(container, state) {
    if (!container) return;
    if (state === "loading") {
      container.innerHTML = "";
      return;
    }
    if (!state.session) {
      container.innerHTML =
        '<a href="' + rel("login.html") + '" class="btn btn-ghost btn-sm">Se connecter</a>' +
        '<a href="' + rel("register.html") + '" class="btn btn-primary btn-sm">Créer un compte</a>';
      return;
    }
    var adminLink = state.isAdmin
      ? '<a href="' + rel("admin/index.html") + '" class="btn btn-ghost btn-sm admin-link">Administration</a>'
      : "";
    container.innerHTML =
      adminLink +
      '<a href="' + rel("profile.html") + '" class="btn btn-ghost btn-sm">Mon profil</a>' +
      '<button type="button" class="btn btn-secondary btn-sm" id="btnLogout_' + container.id + '">Se déconnecter</button>';
    var logoutBtn = document.getElementById("btnLogout_" + container.id);
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async function () {
        await window.sb.auth.signOut();
        window.location.href = rel("index.html");
      });
    }
  }

  // Calcule un lien relatif correct, que la page courante soit à la racine ou dans /admin/
  function rel(path) {
    var inAdmin = window.location.pathname.indexOf("/admin/") !== -1;
    if (!inAdmin) return path;
    if (path.indexOf("admin/") === 0) return path.slice("admin/".length); // déjà dans /admin/
    return "../" + path;
  }

  function highlightActiveLink() {
    var current = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav-links a, .nav-mobile-panel a").forEach(function (a) {
      var href = a.getAttribute("href");
      if (!href) return;
      var file = href.split("/").pop();
      if (file === current) a.classList.add("active");
    });
  }

  function initMobileNav() {
    var toggle = document.getElementById("btnMobileNavToggle");
    var panel = document.getElementById("mobileNavPanel");
    if (!toggle || !panel) return;
    toggle.addEventListener("click", function () {
      panel.classList.toggle("open");
      var expanded = panel.classList.contains("open");
      toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
    });
  }

  async function initAuthState() {
    var desktopArea = document.getElementById("navAuthArea");
    var mobileArea = document.getElementById("navAuthAreaMobile");
    renderAuthArea(desktopArea, "loading");
    renderAuthArea(mobileArea, "loading");

    var sessionRes = await window.sb.auth.getSession();
    var session = sessionRes.data && sessionRes.data.session;

    var isAdmin = false;
    var profile = null;
    if (session) {
      var adminRes = await window.sb.from("admins").select("status").eq("user_id", session.user.id).eq("status", "active").maybeSingle();
      isAdmin = !!(adminRes.data);
      var profileRes = await window.sb.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
      profile = profileRes.data;
    }

    var state = { session: session, isAdmin: isAdmin };
    renderAuthArea(desktopArea, state);
    renderAuthArea(mobileArea, state);

    window.dispatchEvent(new CustomEvent("buildtech:auth-ready", {
      detail: { session: session, isAdmin: isAdmin, profile: profile }
    }));

    window.sb.auth.onAuthStateChange(function (_event, newSession) {
      // Rafraîchit la barre de nav si l'état de connexion change dans un autre onglet.
      if ((!!newSession) !== (!!session)) {
        window.location.reload();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    highlightActiveLink();
    initMobileNav();
    if (window.sb) initAuthState();
  });
})();
