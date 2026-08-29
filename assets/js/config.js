/* ==========================================================================
   BUILD.TECH — Configuration Supabase (frontend)
   ------------------------------------------------------------------------
   Ces deux valeurs ne sont PAS des secrets : l'URL du projet et la clé
   "anon" sont conçues par Supabase pour être visibles dans le navigateur.
   Toute la sécurité réelle est assurée par les règles RLS définies dans
   supabase/schema.sql — jamais par le fait de cacher ces valeurs.
   Remplace les deux lignes ci-dessous par TES valeurs (voir README.md,
   partie "3. Créer le projet Supabase").
   ========================================================================== */
window.BUILD_TECH_CONFIG = {
  SUPABASE_URL: "https://kspaxuvtuzwjotjumakp.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_RGtd76UBTPe-VoPnmp_WaA_rnymuz1U",

  // Optionnel — uniquement si tu actives les notifications push (voir README, partie 9.2)
  VAPID_PUBLIC_KEY: "sb_publishable_RGtd76UBTPe-VoPnmp_WaA_rnymuz1U"
};
