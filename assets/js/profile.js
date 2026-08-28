/* ==========================================================================
   BUILD.TECH — Page Profil : infos du compte + préférence de thème
   ========================================================================== */
(function () {
  async function loadProfile() {
    var sessionRes = await window.sb.auth.getSession();
    var session = sessionRes.data.session;
    if (!session) return; // auth-guard.js gère déjà la redirection

    document.getElementById("pEmail").textContent = session.user.email;
    document.getElementById("avatarInitial").textContent = (session.user.email || "?").charAt(0).toUpperCase();

    var profileRes = await window.sb.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
    if (profileRes.data) {
      document.getElementById("pCreatedAt").textContent = formatDate(profileRes.data.created_at);
    }

    var convRes = await window.sb.from("conversations").select("id", { count: "exact", head: true }).eq("user_id", session.user.id);
    document.getElementById("pConvCount").textContent = convRes.count != null ? convRes.count : "—";
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadProfile();
    var logoutBtn = document.getElementById("btnLogoutProfile");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async function () {
        await window.sb.auth.signOut();
        window.location.href = "index.html";
      });
    }
  });
})();
