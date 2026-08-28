/* ==========================================================================
   BUILD.TECH — Admin : gestion des services (CRUD)
   ========================================================================== */
(function () {
  var services = [];

  async function loadServices() {
    var res = await window.sb.from("services").select("*").order("sort_order", { ascending: true });
    var tbody = document.getElementById("servicesTableBody");
    if (res.error) {
      tbody.innerHTML = '<tr><td colspan="5">Erreur de chargement.</td></tr>';
      return;
    }
    services = res.data || [];
    if (!services.length) {
      tbody.innerHTML = '<tr><td colspan="5">Aucun service pour le moment.</td></tr>';
      return;
    }
    tbody.innerHTML = services.map(renderRow).join("");
    wireRowActions();
  }

  function renderRow(s, index) {
    var statusBadge = s.active ? '<span class="badge badge-success">Actif</span>' : '<span class="badge badge-muted">Masqué</span>';
    return (
      "<tr>" +
        '<td><div class="row-actions">' +
          '<button class="btn btn-ghost btn-sm" data-move-up="' + s.id + '" ' + (index === 0 ? "disabled" : "") + '>↑</button>' +
          '<button class="btn btn-ghost btn-sm" data-move-down="' + s.id + '" ' + (index === services.length - 1 ? "disabled" : "") + '>↓</button>' +
        "</div></td>" +
        "<td>" + escapeHtml(s.name) + "</td>" +
        "<td>" + formatPrice(s.price) + " €</td>" +
        "<td>" + statusBadge + "</td>" +
        '<td><div class="row-actions">' +
          '<button class="btn btn-secondary btn-sm" data-edit="' + s.id + '">Modifier</button>' +
          '<button class="btn btn-ghost btn-sm" data-toggle="' + s.id + '">' + (s.active ? "Désactiver" : "Activer") + '</button>' +
          '<button class="btn btn-danger btn-sm" data-delete="' + s.id + '">Supprimer</button>' +
        "</div></td>" +
      "</tr>"
    );
  }

  function wireRowActions() {
    document.querySelectorAll("[data-edit]").forEach(function (btn) {
      btn.addEventListener("click", function () { openModal(services.find(function (s) { return s.id === btn.getAttribute("data-edit"); })); });
    });
    document.querySelectorAll("[data-toggle]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        var s = services.find(function (s) { return s.id === btn.getAttribute("data-toggle"); });
        await window.sb.from("services").update({ active: !s.active }).eq("id", s.id);
        toast(s.active ? "Service désactivé." : "Service activé.", "success");
        loadServices();
      });
    });
    document.querySelectorAll("[data-delete]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        if (!confirm("Supprimer définitivement ce service ? Cette action est irréversible.")) return;
        await window.sb.from("services").delete().eq("id", btn.getAttribute("data-delete"));
        toast("Service supprimé.", "success");
        loadServices();
      });
    });
    document.querySelectorAll("[data-move-up],[data-move-down]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        var id = btn.getAttribute("data-move-up") || btn.getAttribute("data-move-down");
        var dir = btn.hasAttribute("data-move-up") ? -1 : 1;
        var idx = services.findIndex(function (s) { return s.id === id; });
        var swapIdx = idx + dir;
        if (swapIdx < 0 || swapIdx >= services.length) return;
        var a = services[idx], b = services[swapIdx];
        await window.sb.from("services").update({ sort_order: b.sort_order }).eq("id", a.id);
        await window.sb.from("services").update({ sort_order: a.sort_order }).eq("id", b.id);
        loadServices();
      });
    });
  }

  function openModal(service) {
    document.getElementById("serviceModalTitle").textContent = service ? "Modifier le service" : "Ajouter un service";
    document.getElementById("serviceId").value = service ? service.id : "";
    document.getElementById("serviceName").value = service ? service.name : "";
    document.getElementById("serviceDescription").value = service ? (service.description || "") : "";
    document.getElementById("servicePrice").value = service ? service.price : "";
    document.getElementById("serviceActive").checked = service ? service.active : true;
    document.getElementById("serviceModalOverlay").classList.remove("hidden");
  }
  function closeModal() { document.getElementById("serviceModalOverlay").classList.add("hidden"); }

  document.addEventListener("DOMContentLoaded", function () {
    loadServices();
    document.getElementById("btnNewService").addEventListener("click", function () { openModal(null); });
    document.getElementById("btnCancelServiceModal").addEventListener("click", closeModal);

    document.getElementById("serviceForm").addEventListener("submit", async function (e) {
      e.preventDefault();
      var id = document.getElementById("serviceId").value;
      var payload = {
        name: document.getElementById("serviceName").value.trim(),
        description: document.getElementById("serviceDescription").value.trim(),
        price: Number(document.getElementById("servicePrice").value),
        active: document.getElementById("serviceActive").checked
      };
      if (!payload.name) { toast("Le nom est obligatoire.", "error"); return; }

      var btn = document.getElementById("btnSaveService");
      setButtonLoading(btn, true, "Enregistrement…");
      var res;
      if (id) {
        res = await window.sb.from("services").update(payload).eq("id", id);
      } else {
        payload.sort_order = services.length;
        res = await window.sb.from("services").insert(payload);
      }
      setButtonLoading(btn, false);

      if (res.error) { toast("Erreur : " + res.error.message, "error"); return; }
      toast(id ? "Service modifié avec succès." : "Service ajouté avec succès.", "success");
      closeModal();
      loadServices();
    });
  });
})();
