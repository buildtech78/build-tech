-- ============================================================================
-- BUILD.TECH — Règles de sécurité du stockage (Supabase Storage)
-- ----------------------------------------------------------------------------
-- À exécuter APRÈS avoir créé le bucket "components" depuis le Dashboard
-- (Storage → New bucket → nom EXACT : components → Public bucket : activé).
-- Voir README.md, partie "5. Configurer le stockage des images".
-- ============================================================================

-- Lecture publique des photos (nécessaire pour les afficher sur la page
-- Composants, y compris pour les visiteurs non connectés).
create policy "components_bucket_public_read"
on storage.objects for select
using (bucket_id = 'components');

-- Seuls les administrateurs peuvent envoyer, remplacer ou supprimer des photos.
create policy "components_bucket_admin_insert"
on storage.objects for insert
with check (bucket_id = 'components' and public.is_admin(auth.uid()));

create policy "components_bucket_admin_update"
on storage.objects for update
using (bucket_id = 'components' and public.is_admin(auth.uid()));

create policy "components_bucket_admin_delete"
on storage.objects for delete
using (bucket_id = 'components' and public.is_admin(auth.uid()));
