/* ==========================================================================
   BUILD.TECH — Admin : gestion des composants (CRUD + upload photo + catégories)
   ========================================================================== */
(function () {
  var components = [];
  var categories = [];
  var MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo
  var ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

  function publicImageUrl(path) {
    if (!path) return null;
    var res = window.sb.storage.from("components").getPublicUrl(path);
    return res.data ? res.data.publicUrl : null;
  }

  async function loadCategories() {
    var res = await window.sb.from("component_categories").select("*").order("sort_order", { ascending: true });
    categories = res.data || [];
    var select = document.getElementById("componentCategory");
    select.innerHTML = '<option value="">Aucune</option>' + categories.map(function (c) {
      return '<option value="' + c.id + '">' + escapeHtml(c.name) + "</option>";
    }).join("");
    renderCategoryList();
  }

  function renderCategoryList() {
    var list = document.getElementById("categoryList");
    if (!list) return;
    if (!categories.length) { list.innerHTML = "<li>Aucune catégorie pour le moment.</li>"; return; }
    list.innerHTML = categories.map(function (c) {
      return '<li><span class="k">' + escapeHtml(c.name) + '</span><button class="btn btn-danger btn-sm" data-delete-category="' + c.id + '">Supprimer</button></li>';
    }).join("");
    list.querySelectorAll("[data-delete-category]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        if (!confirm("Supprimer cette catégorie ? Les composants concernés resteront mais sans catégorie.")) return;
        await window.sb.from("component_categories").delete().eq("id", btn.getAttribute("data-delete-category"));
        loadCategories();
        loadComponents();
      });
    });
  }

  async function loadComponents() {
    var res = await window.sb.from("components").select("*, component_categories(name)").order("created_at", { ascending: false });
    var tbody = document.getElementById("componentsTableBody");
    if (res.error) { tbody.innerHTML = '<tr><td colspan="6">Erreur de chargement.</td></tr>'; return; }
    components = res.data || [];
    if (!components.length) { tbody.innerHTML = '<tr><td colspan="6">Aucun composant pour le moment.</td></tr>'; return; }
    tbody.innerHTML = components.map(renderRow).join("");
    wireRowActions();
  }

  function renderRow(c) {
    var img = publicImageUrl(c.image_path);
    var thumb = img ? '<img src="' + img + '" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:4px;">' : "—";
    var statusBadges = (c.available ? '<span class="badge badge-success">Disponible</span>' : '<span class="badge badge-danger">Indispo.</span>') +
      (c.negotiable ? ' <span class="badge badge-warn">Négociable</span>' : "");
    return (
      "<tr>" +
        "<td>" + thumb + "</td>" +
        "<td>" + escapeHtml(c.title) + "</td>" +
        "<td>" + (c.component_categories ? escapeHtml(c.component_categories.name) : "—") + "</td>" +
        "<td>" + formatPrice(c.price) + " €</td>" +
        "<td>" + statusBadges + "</td>" +
        '<td><div class="row-actions">' +
          '<button class="btn btn-secondary btn-sm" data-edit="' + c.id + '">Modifier</button>' +
          '<button class="btn btn-ghost btn-sm" data-toggle-available="' + c.id + '">' + (c.available ? "Marquer indispo." : "Marquer dispo.") + '</button>' +
          '<button class="btn btn-danger btn-sm" data-delete="' + c.id + '">Supprimer</button>' +
        "</div></td>" +
      "</tr>"
    );
  }

  function wireRowActions() {
    document.querySelectorAll("[data-edit]").forEach(function (btn) {
      btn.addEventListener("click", function () { openModal(components.find(function (c) { return c.id === btn.getAttribute("data-edit"); })); });
    });
    document.querySelectorAll("[data-toggle-available]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        var c = components.find(function (c) { return c.id === btn.getAttribute("data-toggle-available"); });
        await window.sb.from("components").update({ available: !c.available }).eq("id", c.id);
        loadComponents();
      });
    });
    document.querySelectorAll("[data-delete]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        if (!confirm("Supprimer définitivement ce composant ? Cette action est irréversible.")) return;
        var c = components.find(function (c) { return c.id === btn.getAttribute("data-delete"); });
        if (c && c.image_path) await window.sb.storage.from("components").remove([c.image_path]);
        await window.sb.from("components").delete().eq("id", c.id);
        toast("Composant supprimé.", "success");
        loadComponents();
      });
    });
  }

  function openModal(c) {
    document.getElementById("componentModalTitle").textContent = c ? "Modifier le composant" : "Ajouter un composant";
    document.getElementById("componentId").value = c ? c.id : "";
    document.getElementById("componentExistingImagePath").value = c ? (c.image_path || "") : "";
    document.getElementById("componentTitle").value = c ? c.title : "";
    document.getElementById("componentDescription").value = c ? (c.description || "") : "";
    document.getElementById("componentPrice").value = c ? c.price : "";
    document.getElementById("componentCategory").value = c ? (c.category_id || "") : "";
    document.getElementById("componentNegotiable").checked = c ? c.negotiable : false;
    document.getElementById("componentAvailable").checked = c ? c.available : true;
    document.getElementById("componentImage").value = "";
    var previewWrap = document.getElementById("componentImagePreviewWrap");
    var existingUrl = c ? publicImageUrl(c.image_path) : null;
    previewWrap.innerHTML = existingUrl ? '<img src="' + existingUrl + '" style="width:90px;height:90px;object-fit:cover;border-radius:6px;">' : "";
    document.getElementById("componentModalOverlay").classList.remove("hidden");
  }
  function closeModal() { document.getElementById("componentModalOverlay").classList.add("hidden"); }

  async function uploadImageIfProvided() {
    var input = document.getElementById("componentImage");
    var file = input.files && input.files[0];
    if (!file) return { path: null, skipped: true };

    if (ALLOWED_TYPES.indexOf(file.type) === -1) {
      toast("Format d'image non supporté (JPG, PNG ou WEBP uniquement).", "error");
      return { error: true };
    }
    if (file.size > MAX_FILE_SIZE) {
      toast("L'image dépasse la taille maximale autorisée (5 Mo).", "error");
      return { error: true };
    }
    var ext = file.name.split(".").pop().toLowerCase();
    var path = (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2)) + "." + ext;
    var uploadRes = await window.sb.storage.from("components").upload(path, file, { upsert: false, contentType: file.type });
    if (uploadRes.error) {
      toast("Échec de l'upload de l'image : " + uploadRes.error.message, "error");
      return { error: true };
    }
    return { path: path };
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadCategories();
    loadComponents();

    document.getElementById("btnNewComponent").addEventListener("click", function () { openModal(null); });
    document.getElementById("btnCancelComponentModal").addEventListener("click", closeModal);

    document.getElementById("btnManageCategories").addEventListener("click", function () {
      document.getElementById("categoryModalOverlay").classList.remove("hidden");
    });
    document.getElementById("btnCloseCategoryModal").addEventListener("click", function () {
      document.getElementById("categoryModalOverlay").classList.add("hidden");
    });
    document.getElementById("categoryForm").addEventListener("submit", async function (e) {
      e.preventDefault();
      var input = document.getElementById("newCategoryName");
      var name = input.value.trim();
      if (!name) return;
      await window.sb.from("component_categories").insert({ name: name, sort_order: categories.length });
      input.value = "";
      loadCategories();
    });

    document.getElementById("componentForm").addEventListener("submit", async function (e) {
      e.preventDefault();
      var id = document.getElementById("componentId").value;
      var btn = document.getElementById("btnSaveComponent");
      setButtonLoading(btn, true, "Enregistrement…");

      var uploadResult = await uploadImageIfProvided();
      if (uploadResult.error) { setButtonLoading(btn, false); return; }

      var payload = {
        title: document.getElementById("componentTitle").value.trim(),
        description: document.getElementById("componentDescription").value.trim(),
        price: Number(document.getElementById("componentPrice").value),
        category_id: document.getElementById("componentCategory").value || null,
        negotiable: document.getElementById("componentNegotiable").checked,
        available: document.getElementById("componentAvailable").checked
      };
      if (!uploadResult.skipped) payload.image_path = uploadResult.path;

      if (!payload.title) { toast("Le titre est obligatoire.", "error"); setButtonLoading(btn, false); return; }

      var res = id
        ? await window.sb.from("components").update(payload).eq("id", id)
        : await window.sb.from("components").insert(payload);

      setButtonLoading(btn, false);
      if (res.error) { toast("Erreur : " + res.error.message, "error"); return; }
      toast(id ? "Composant modifié avec succès." : "Composant ajouté avec succès.", "success");
      closeModal();
      loadComponents();
    });
  });
})();
