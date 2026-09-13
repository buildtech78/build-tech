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
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzcGF4dXZ0dXp3am90anVtYWtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4OTI2MzIsImV4cCI6MjEwMzQ2ODYzMn0.dLHNi-BN32nLYlAt7_SqQ2ikzn53bfNbGeM_qyb7_pY",

  // Optionnel — uniquement si tu actives les notifications push (voir README, partie 9.2)
  VAPID_PUBLIC_KEY: ""
};