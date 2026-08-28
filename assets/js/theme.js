/* ==========================================================================
   BUILD.TECH — Gestion du thème clair / sombre / système
   ========================================================================== */
(function () {
  var STORAGE_KEY = "buildtech-theme";

  function resolve(pref) {
    if (pref === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return pref;
  }

  function getStoredPref() {
    return localStorage.getItem(STORAGE_KEY) || "system";
  }

  function apply(pref) {
    var resolved = resolve(pref);
    document.documentElement.setAttribute("data-theme", resolved);
    localStorage.setItem(STORAGE_KEY, pref);
    updateToggleUI(pref);
    window.dispatchEvent(new CustomEvent("buildtech:themechange", { detail: { theme: resolved, pref: pref } }));
  }

  function updateToggleUI(pref) {
    document.querySelectorAll("[data-theme-option]").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-theme-option") === pref);
    });
    var cycleBtn = document.getElementById("btnThemeToggle");
    if (cycleBtn) {
      var icons = { light: "☀️", dark: "🌙", system: "🖥️" };
      cycleBtn.setAttribute("aria-label", "Thème : " + pref);
      cycleBtn.setAttribute("title", "Thème : " + pref + " (cliquer pour changer)");
    }
  }

  /** Change le thème, l'enregistre en local, et si l'utilisateur est
   *  connecté, le synchronise aussi sur son profil Supabase. */
  window.setThemePreference = function (pref) {
    apply(pref);
    if (window.sb) {
      window.sb.auth.getSession().then(function (res) {
        var session = res.data && res.data.session;
        if (!session) return;
        window.sb.from("profiles")
          .update({ theme_preference: pref })
          .eq("id", session.user.id)
          .then(function () {});
      });
    }
  };

  window.cycleTheme = function () {
    var order = ["light", "dark", "system"];
    var current = getStoredPref();
    var next = order[(order.indexOf(current) + 1) % order.length];
    window.setThemePreference(next);
  };

  // Ré-applique le thème si la préférence est "système" et que l'OS change.
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
    if (getStoredPref() === "system") apply("system");
  });

  document.addEventListener("DOMContentLoaded", function () {
    updateToggleUI(getStoredPref());
    var toggle = document.getElementById("btnThemeToggle");
    if (toggle) toggle.addEventListener("click", window.cycleTheme);
    document.querySelectorAll("[data-theme-option]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        window.setThemePreference(btn.getAttribute("data-theme-option"));
      });
    });
  });

  // À la connexion, la préférence enregistrée sur le profil (si elle existe
  // et diffère) reprend la main — utile en cas de connexion sur un nouvel appareil.
  window.addEventListener("buildtech:auth-ready", function (e) {
    var profile = e.detail && e.detail.profile;
    if (profile && profile.theme_preference && profile.theme_preference !== getStoredPref()) {
      apply(profile.theme_preference);
    }
  });
})();
