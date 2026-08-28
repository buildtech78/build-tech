/* ==========================================================================
   BUILD.TECH — Admin : paramètres / contenu du site (table site_settings)
   ========================================================================== */
(function () {
  var FIELDS = {
    slogan: "setSlogan",
    hero_lead: "setLead",
    about_text: "setAbout",
    contact_email: "setContactEmail"
  };

  async function loadSettings() {
    var res = await window.sb.from("site_settings").select("key,value");
    if (res.error) return;
    var map = {};
    (res.data || []).forEach(function (row) { map[row.key] = row.value; });
    Object.keys(FIELDS).forEach(function (key) {
      var el = document.getElementById(FIELDS[key]);
      if (el && map[key] !== undefined && map[key] !== null) el.value = map[key];
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadSettings();
    document.getElementById("settingsForm").addEventListener("submit", async function (e) {
      e.preventDefault();
      var btn = document.getElementById("btnSaveSettings");
      setButtonLoading(btn, true, "Enregistrement…");

      var rows = Object.keys(FIELDS).map(function (key) {
        return { key: key, value: document.getElementById(FIELDS[key]).value };
      });
      var res = await window.sb.from("site_settings").upsert(rows, { onConflict: "key" });

      setButtonLoading(btn, false);
      if (res.error) { toast("Erreur : " + res.error.message, "error"); return; }
      toast("Paramètres enregistrés.", "success");
    });
  });
})();
