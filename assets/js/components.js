/* ==========================================================================
   BUILD.TECH — Page Composants : chargement, recherche, filtres, tri
   ========================================================================== */
(function () {
  var allComponents = [];

  function publicImageUrl(path) {
    if (!path) return null;
    var res = window.sb.storage.from("components").getPublicUrl(path);
    return res.data ? res.data.publicUrl : null;
  }

  async function loadCategories() {
    var res = await window.sb.from("component_categories").select("*").order("sort_order", { ascending: true });
    var select = document.getElementById("fCategory");
    if (res.data) {
      res.data.forEach(function (cat) {
        var opt = document.createElement("option");
        opt.value = cat.id;
        opt.textContent = cat.name;
        select.appendChild(opt);
      });
    }
  }

  async function loadComponents() {
    var loading = document.getElementById("componentsLoading");
    var res = await window.sb.from("components")
      .select("*, component_categories(name)")
      .order("created_at", { ascending: false });
    loading.classList.add("hidden");
    if (res.error) {
      toast("Impossible de charger les composants.", "error");
      return;
    }
    allComponents = res.data || [];
    applyFilters();
  }

  function applyFilters() {
    var search = document.getElementById("fSearch").value.trim().toLowerCase();
    var category = document.getElementById("fCategory").value;
    var sort = document.getElementById("fSort").value;
    var availableOnly = document.getElementById("fAvailableOnly").checked;

    var list = allComponents.filter(function (c) {
      if (availableOnly && !c.available) return false;
      if (category && c.category_id !== category) return false;
      if (search) {
        var haystack = (c.title + " " + (c.description || "")).toLowerCase();
        if (haystack.indexOf(search) === -1) return false;
      }
      return true;
    });

    list.sort(function (a, b) {
      if (sort === "price_asc") return (a.price || 0) - (b.price || 0);
      if (sort === "price_desc") return (b.price || 0) - (a.price || 0);
      return new Date(b.created_at) - new Date(a.created_at);
    });

    renderGrid(list);
  }

  function renderGrid(list) {
    var grid = document.getElementById("componentsGrid");
    var empty = document.getElementById("componentsEmpty");
    if (!list.length) {
      grid.innerHTML = "";
      empty.classList.remove("hidden");
      return;
    }
    empty.classList.add("hidden");
    grid.innerHTML = list.map(renderCard).join("");
    grid.querySelectorAll("[data-contact-component]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        window.contactAbout("component", btn.getAttribute("data-contact-component"), btn.getAttribute("data-component-name"));
      });
    });
  }

  function renderCard(c) {
    var img = publicImageUrl(c.image_path);
    var thumb = img
      ? '<img src="' + img + '" alt="' + escapeHtml(c.title) + '" loading="lazy">'
      : '<span class="placeholder">🧩</span>';
    var badges = "";
    if (c.available) badges += '<span class="badge badge-success">Disponible</span>';
    else badges += '<span class="badge badge-danger">Indisponible</span>';
    if (c.negotiable) badges += '<span class="badge badge-warn">Négociable</span>';
    if (c.component_categories && c.component_categories.name) {
      badges += '<span class="badge badge-muted">' + escapeHtml(c.component_categories.name) + "</span>";
    }
    return (
      '<div class="blueprint-card component-card reveal">' +
        '<div class="thumb">' + thumb + "</div>" +
        '<div class="body">' +
          '<div class="badges">' + badges + "</div>" +
          "<h3>" + escapeHtml(c.title) + "</h3>" +
          '<p class="desc">' + escapeHtml(c.description || "") + "</p>" +
          '<div class="meta-row"><span class="price-tag">' + formatPrice(c.price) + '</span><span class="field-hint">' + formatDate(c.created_at) + "</span></div>" +
          '<button type="button" class="btn btn-primary btn-block" data-contact-component="' + c.id + '" data-component-name="' + escapeHtml(c.title) + '">Nous contacter</button>' +
        "</div>" +
      "</div>"
    );
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadCategories();
    loadComponents();
    document.getElementById("fSearch").addEventListener("input", debounce(applyFilters, 200));
    document.getElementById("fCategory").addEventListener("change", applyFilters);
    document.getElementById("fSort").addEventListener("change", applyFilters);
    document.getElementById("fAvailableOnly").addEventListener("change", applyFilters);
  });
})();
