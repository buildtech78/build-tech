-- ============================================================================
-- BUILD.TECH — Migration 03 : images dans le chat
-- ----------------------------------------------------------------------------
-- Permet aux clients ET aux administrateurs d'envoyer une image dans une
-- conversation. Les images sont stockées dans un bucket PRIVÉ (contrairement
-- aux photos de composants/profil qui sont publiques) : seules les personnes
-- concernées par la conversation (le client ou un admin) peuvent les voir,
-- via une URL signée temporaire — jamais une URL publique permanente.
--
-- Écrit pour pouvoir être relancé plusieurs fois sans erreur.
-- ============================================================================

alter table public.messages add column if not exists image_path text;
alter table public.messages alter column content drop not null;

alter table public.messages drop constraint if exists messages_content_check;
alter table public.messages add constraint messages_content_check
  check (
    (content is not null and char_length(content) between 1 and 4000)
    or image_path is not null
  );

-- ============================================================================
-- Crée d'abord le bucket depuis le Dashboard AVANT d'exécuter la suite :
-- Storage → New bucket → nom EXACT : chat-attachments → Public bucket :
-- DÉSACTIVÉ (contrairement aux autres buckets, celui-ci doit rester privé).
-- ============================================================================

drop policy if exists "chat_attachments_participant_read" on storage.objects;
create policy "chat_attachments_participant_read" on storage.objects
for select
using (
  bucket_id = 'chat-attachments' and exists (
    select 1 from public.conversations c
    where c.id::text = (storage.foldername(name))[1]
      and (c.user_id = auth.uid() or public.is_admin(auth.uid()))
  )
);

drop policy if exists "chat_attachments_participant_insert" on storage.objects;
create policy "chat_attachments_participant_insert" on storage.objects
for insert
with check (
  bucket_id = 'chat-attachments' and exists (
    select 1 from public.conversations c
    where c.id::text = (storage.foldername(name))[1]
      and (c.user_id = auth.uid() or public.is_admin(auth.uid()))
  )
);
