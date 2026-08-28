/* ==========================================================================
   BUILD.TECH — Garde de page : réservée aux administrateurs.
   NOTE SÉCURITÉ : ce script masque simplement l'interface pour les
   non-administrateurs. La vraie protection est assurée par la table
   `admins` + les règles RLS (voir supabase/schema.sql) : toute tentative
   de lecture/écriture admin depuis la base est vérifiée côté serveur,
   qu'importe ce que fait — ou ne fait pas — le frontend.
   ========================================================================== */
(function () {
  document.addEventListener("DOMContentLoaded", async function () {
    if (!window.sb) return;
    var sessionRes = await window.sb.auth.getSession();
    var session = sessionRes.data.session;
    if (!session) {
      window.location.href = "../login.html?next=admin";
      return;
    }
    var adminRes = await window.sb.from("admins").select("status,is_owner").eq("user_id", session.user.id).eq("status", "active").maybeSingle();
    if (!adminRes.data) {
      window.location.href = "../index.html";
      return;
    }
    window.BUILD_TECH_IS_OWNER = !!adminRes.data.is_owner;
    window.dispatchEvent(new CustomEvent("buildtech:admin-ready", { detail: { session: session, isOwner: window.BUILD_TECH_IS_OWNER } }));
  });
})();
