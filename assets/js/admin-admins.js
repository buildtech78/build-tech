/* ==========================================================================
   BUILD.TECH — Admin : gestion des administrateurs (réservé au compte centre)
   ========================================================================== */
(function () {
  async function loadAdmins() {
    var tbody = document.getElementById("adminsTableBody");
    var res = await window.sb.from("admins").select("*, profiles(email)").order("added_at", { ascending: true });
    if (res.error) { tbody.innerHTML = '<tr><td colspan="4">Erreur de chargement.</td></tr>'; return; }
    var admins = res.data || [];
    if (!admins.length) { tbody.innerHTML = '<tr><td colspan="4">Aucun administrateur.</td></tr>'; return; }
    tbody.innerHTML = admins.map(renderRow).join("");
    wireActions();
  }

  function renderRow(a) {
    var email = a.profiles ? a.profiles.email : "—";
    var statusBadge = a.status === "active" ? '<span class="badge badge-success">Actif</span>' : '<span class="badge badge-muted">Révoqué</span>';
    var ownerBadge = a.is_owner ? ' <span class="badge badge-warn">Compte centre</span>' : "";
    var actions = a.is_owner
      ? '<span class="field-hint">Protégé</span>'
      : (window.BUILD_TECH_IS_OWNER
          ? (a.status === "active"
              ? '<button class="btn btn-danger btn-sm" data-revoke="' + a.user_id + '">Retirer les droits</button>'
              : '<button class="btn btn-secondary btn-sm" data-restore="' + a.user_id + '">Réactiver</button>')
          : "");
    return (
      "<tr>" +
        "<td>" + escapeHtml(email) + ownerBadge + "</td>" +
        "<td>" + formatDate(a.added_at) + "</td>" +
        "<td>" + statusBadge + "</td>" +
        '<td><div class="row-actions">' + actions + "</div></td>" +
      "</tr>"
    );
  }

  function wireActions() {
    document.querySelectorAll("[data-revoke]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        if (!confirm("Retirer les droits administrateur à ce compte ?")) return;
        try { await callAdminAction("revoke_admin", { userId: btn.getAttribute("data-revoke") }); toast("Droits retirés.", "success"); loadAdmins(); }
        catch (e) { toast(e.message, "error"); }
      });
    });
    document.querySelectorAll("[data-restore]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        try { await callAdminAction("grant_admin", { userId: btn.getAttribute("data-restore") }); toast("Droits restaurés.", "success"); loadAdmins(); }
        catch (e) { toast(e.message, "error"); }
      });
    });
  }

  window.addEventListener("buildtech:admin-ready", function (e) {
    if (e.detail.isOwner) document.getElementById("ownerOnlyAddForm").classList.remove("hidden");
  });

  document.addEventListener("DOMContentLoaded", function () {
    loadAdmins();
    document.getElementById("addAdminForm").addEventListener("submit", async function (ev) {
      ev.preventDefault();
      var email = document.getElementById("newAdminEmail").value.trim();
      if (!email) return;
      try {
        var result = await callAdminAction("invite_admin", { email: email });
        toast(result.message || "Administrateur ajouté.", "success");
        document.getElementById("newAdminEmail").value = "";
        loadAdmins();
      } catch (e) { toast(e.message, "error"); }
    });
  });
})();
