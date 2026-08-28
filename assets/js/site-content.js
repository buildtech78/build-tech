/* ==========================================================================
   BUILD.TECH — Applique les textes modifiés depuis le panneau d'administration
   (table `site_settings`) sur les éléments marqués data-setting="clé".
   Si aucune valeur n'est enregistrée, le texte par défaut du HTML reste affiché.
   ========================================================================== */
(function () {
  async function applySiteSettings() {
    if (!window.sb) return;
    var res = await window.sb.from("site_settings").select("key,value");
    if (res.error || !res.data) return;
    var map = {};
    res.data.forEach(function (row) { map[row.key] = row.value; });

    document.querySelectorAll("[data-setting]").forEach(function (el) {
      var key = el.getAttribute("data-setting");
      var value = map[key];
      if (value === undefined || value === null || value === "") return;
      el.textContent = typeof value === "string" ? value : String(value);
    });
  }
  document.addEventListener("DOMContentLoaded", applySiteSettings);
})();
