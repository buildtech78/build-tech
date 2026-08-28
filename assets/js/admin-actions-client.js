/* ==========================================================================
   BUILD.TECH — Client pour la Edge Function "admin-actions"
   Toutes les actions sensibles (suspendre/supprimer un compte, gérer les
   administrateurs) passent par cette fonction serveur, qui revérifie
   elle-même les droits de l'appelant avant d'agir. Voir
   supabase/functions/admin-actions/index.ts
   ========================================================================== */
async function callAdminAction(action, payload) {
  var sessionRes = await window.sb.auth.getSession();
  var session = sessionRes.data.session;
  if (!session) throw new Error("not_authenticated");

  var url = (window.BUILD_TECH_CONFIG.SUPABASE_URL).replace(/\/$/, "") + "/functions/v1/admin-actions";
  var res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + session.access_token
    },
    body: JSON.stringify({ action: action, payload: payload })
  });
  var data = await res.json().catch(function () { return {}; });
  if (!res.ok) throw new Error(data.error || "Une erreur est survenue.");
  return data;
}
