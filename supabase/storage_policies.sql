-- ============================================================================
-- BUILD.TECH — Règles de sécurité du stockage (Supabase Storage)
-- ----------------------------------------------------------------------------
-- À exécuter APRÈS avoir créé le bucket "components" depuis le Dashboard
-- (Storage → New bucket → nom EXACT : components → Public bucket : activé).
-- Voir README.md, partie "5. Configurer le stockage des images".
-- ============================================================================

-- Lecture publique des photos (nécessaire pour les afficher sur la page
-- Composants, y compris pour les visiteurs non connectés).
drop policy if exists "components_bucket_public_read" on storage.objects;
create policy "components_bucket_public_read"
on storage.objects for select
using (bucket_id = 'components');

-- Seuls les administrateurs peuvent envoyer, remplacer ou supprimer des photos.
drop policy if exists "components_bucket_admin_insert" on storage.objects;
create policy "components_bucket_admin_insert"
on storage.objects for insert
with check (bucket_id = 'components' and public.is_admin(auth.uid()));

drop policy if exists "components_bucket_admin_update" on storage.objects;
create policy "components_bucket_admin_update"
on storage.objects for update
using (bucket_id = 'components' and public.is_admin(auth.uid()));

drop policy if exists "components_bucket_admin_delete" on storage.objects;
create policy "components_bucket_admin_delete"
on storage.objects for delete
using (bucket_id = 'components' and public.is_admin(auth.uid()));

-- ============================================================================
-- Bucket "avatars" — photos de profil. Crée-le depuis le Dashboard
-- (Storage → New bucket → nom EXACT : avatars → Public bucket : activé)
-- avant d'exécuter la partie ci-dessous.
-- ============================================================================

drop policy if exists "avatars_bucket_public_read" on storage.objects;
create policy "avatars_bucket_public_read"
on storage.objects for select
using (bucket_id = 'avatars');

-- Chaque utilisateur ne peut envoyer/modifier/supprimer que SA PROPRE photo,
-- stockée sous le chemin {son_user_id}/avatar.ext.
drop policy if exists "avatars_bucket_owner_insert" on storage.objects;
create policy "avatars_bucket_owner_insert"
on storage.objects for insert
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_bucket_owner_update" on storage.objects;
create policy "avatars_bucket_owner_update"
on storage.objects for update
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_bucket_owner_delete" on storage.objects;
create policy "avatars_bucket_owner_delete"
on storage.objects for delete
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
