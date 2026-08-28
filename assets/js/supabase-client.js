/* ==========================================================================
   BUILD.TECH — Client Supabase partagé
   ========================================================================== */
(function () {
  var cfg = window.BUILD_TECH_CONFIG || {};
  if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.indexOf("VOTRE-PROJET") !== -1) {
    console.warn(
      "[Build.Tech] Supabase n'est pas encore configuré. " +
      "Ouvre assets/js/config.js et renseigne SUPABASE_URL et SUPABASE_ANON_KEY " +
      "(voir README.md, partie 3)."
    );
  }
  window.sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
})();
