/* ==========================================================================
   BUILD.TECH — Admin : liste des utilisateurs + actions (suspendre/supprimer)
   Les actions sensibles passent par la Edge Function "admin-actions", qui
   utilise la clé service_role côté serveur (jamais exposée au frontend).
   ========================================================================== */
(function () {
  var users = [];

  async function loadUsers() {
    var tbody = document.getElementById("usersTableBody");
    var profilesRes = await window.sb.from("profiles").select("*").order("created_at", { ascending: false });
    if (profilesRes.error) { tbody.innerHTML = '<tr><td colspan="5">Erreur de chargement.</td></tr>'; return; }

    var countsRes = await window.sb.from("user_conversation_counts").select("*");
    var countMap = {};
    (countsRes.data || []).forEach(function (r) { countMap[r.user_id] = r.conversation_count; });

    users = profilesRes.data || [];
    if (!users.length) { tbody.innerHTML = '<tr><td colspan="5">Aucun utilisateur pour le moment.</td></tr>'; return; }

    tbody.innerHTML = users.map(function (u) { return renderRow(u, countMap[u.id] || 0); }).join("");
    wireRowActions();
  }

  function renderRow(u, convCount) {
    var statusBadge = u.suspended ? '<span class="badge badge-danger">Suspendu</span>' : '<span class="badge badge-success">Actif</span>';
    return (
      "<tr>" +
        "<td>" + escapeHtml(u.email) + "</td>" +
        "<td>" + formatDate(u.created_at) + "</td>" +
        "<td>" + convCount + "</td>" +
        "<td>" + statusBadge + "</td>" +
        '<td><div class="row-actions">' +
          (u.suspended
            ? '<button class="btn btn-secondary btn-sm" data-reactivate="' + u.id + '">Réactiver</button>'
            : '<button class="btn btn-ghost btn-sm" data-suspend="' + u.id + '">Suspendre</button>') +
          '<button class="btn btn-danger btn-sm" data-delete="' + u.id + '">Supprimer</button>' +
        "</div></td>" +
      "</tr>"
    );
  }

  function wireRowActions() {
    document.querySelectorAll("[data-suspend]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        if (!confirm("Suspendre ce compte ? L'utilisateur ne pourra plus se connecter.")) return;
        try { await callAdminAction("suspend_user", { userId: btn.getAttribute("data-suspend") }); toast("Compte suspendu.", "success"); loadUsers(); }
        catch (e) { toast(e.message, "error"); }
      });
    });
    document.querySelectorAll("[data-reactivate]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        try { await callAdminAction("reactivate_user", { userId: btn.getAttribute("data-reactivate") }); toast("Compte réactivé.", "success"); loadUsers(); }
        catch (e) { toast(e.message, "error"); }
      });
    });
    document.querySelectorAll("[data-delete]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        if (!confirm("Êtes-vous sûr de vouloir supprimer ce compte ? Cette action est irréversible.")) return;
        try { await callAdminAction("delete_user", { userId: btn.getAttribute("data-delete") }); toast("Compte supprimé.", "success"); loadUsers(); }
        catch (e) { toast(e.message, "error"); }
      });
    });
  }

  document.addEventListener("DOMContentLoaded", loadUsers);
})();
