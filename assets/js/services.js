/* ==========================================================================
   BUILD.TECH — Page Services : chargement + affichage des cartes
   ========================================================================== */
(function () {
  async function loadServices() {
    var loading = document.getElementById("servicesLoading");
    var empty = document.getElementById("servicesEmpty");
    var grid = document.getElementById("servicesGrid");

    var res = await window.sb.from("services")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true });

    loading.classList.add("hidden");

    if (res.error) {
      toast("Impossible de charger les services.", "error");
      return;
    }
    if (!res.data.length) {
      empty.classList.remove("hidden");
      return;
    }

    grid.innerHTML = res.data.map(renderCard).join("");

    grid.querySelectorAll("[data-contact-service]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        window.contactAbout("service", btn.getAttribute("data-contact-service"), btn.getAttribute("data-service-name"));
      });
    });
  }

  function renderCard(service) {
    return (
      '<div class="blueprint-card service-card reveal">' +
        "<h3>" + escapeHtml(service.name) + "</h3>" +
        "<p>" + escapeHtml(service.description || "") + "</p>" +
        '<div class="price-tag">' + formatPrice(service.price) + "</div>" +
        '<button type="button" class="btn btn-primary btn-block" data-contact-service="' + service.id + '" data-service-name="' + escapeHtml(service.name) + '">Nous contacter</button>' +
      "</div>"
    );
  }

  document.addEventListener("DOMContentLoaded", loadServices);
})();
