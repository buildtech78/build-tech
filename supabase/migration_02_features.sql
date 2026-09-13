-- ============================================================================
-- BUILD.TECH — Migration 02 (à exécuter en plus de schema.sql, déjà appliqué)
-- ----------------------------------------------------------------------------
-- Ajoute : prénom/nom + photo de profil, avis 5 étoiles, compteur de visites
-- anonyme, suppression de conversation, et active le temps réel du chat.
--
-- Ce fichier est écrit pour pouvoir être exécuté PLUSIEURS FOIS sans erreur
-- (si une exécution précédente s'est arrêtée en cours de route) : chaque
-- étape vérifie d'abord si elle a déjà été faite.
-- ============================================================================

-- ---- Profil : prénom / nom (facultatifs) + photo ----
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists avatar_path text;

grant update (first_name, last_name, avatar_path) on public.profiles to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  has_invite boolean;
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data->>'first_name', ''),
    nullif(new.raw_user_meta_data->>'last_name', '')
  );

  select exists(
    select 1 from public.admin_invites where email = new.email and accepted = false
  ) into has_invite;

  if has_invite then
    update public.admin_invites set accepted = true where email = new.email and accepted = false;
    insert into public.admins (user_id, is_owner, status) values (new.id, false, 'active')
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

-- ---- Suppression d'une conversation (utilisateur ou admin) ----
drop policy if exists "conversations_delete_own_or_admin" on public.conversations;
create policy "conversations_delete_own_or_admin" on public.conversations
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- ---- Avis clients (5 étoiles) ----
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  display_name text,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

drop policy if exists "reviews_public_read" on public.reviews;
create policy "reviews_public_read" on public.reviews
  for select to anon, authenticated
  using (true);

drop policy if exists "reviews_insert_own" on public.reviews;
create policy "reviews_insert_own" on public.reviews
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "reviews_update_own" on public.reviews;
create policy "reviews_update_own" on public.reviews
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "reviews_delete_own_or_admin" on public.reviews;
create policy "reviews_delete_own_or_admin" on public.reviews
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- ---- Compteur de visites anonyme (aucune donnée identifiante stockée) ----
create table if not exists public.page_views (
  id bigint generated always as identity primary key,
  path text,
  created_at timestamptz not null default now()
);

alter table public.page_views enable row level security;
create index if not exists idx_page_views_created_at on public.page_views(created_at);

drop policy if exists "page_views_insert_anyone" on public.page_views;
create policy "page_views_insert_anyone" on public.page_views
  for insert to anon, authenticated
  with check (true);

drop policy if exists "page_views_admin_read" on public.page_views;
create policy "page_views_admin_read" on public.page_views
  for select to authenticated
  using (public.is_admin(auth.uid()));

-- ---- Active le temps réel pour le chat et la liste de conversations ----
-- (Sans ceci, les messages n'apparaissent qu'après rechargement de la page.)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;
end $$;
