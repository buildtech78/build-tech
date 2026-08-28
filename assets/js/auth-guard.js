/* ==========================================================================
   BUILD.TECH — Garde de page : redirige vers la connexion si non connecté.
   NOTE SÉCURITÉ : ceci est un confort d'interface (UX), pas une protection.
   La vraie protection des données vient des règles RLS côté Supabase :
   même si quelqu'un contournait ce script, il ne pourrait lire/modifier
   que ce que les policies RLS autorisent pour son propre compte.
   ========================================================================== */
(function () {
  document.addEventListener("DOMContentLoaded", async function () {
    if (!window.sb) return;
    var res = await window.sb.auth.getSession();
    if (!res.data.session) {
      var here = encodeURIComponent(window.location.pathname.split("/").pop());
      window.location.href = "login.html?next=" + here;
    }
  });
})();
