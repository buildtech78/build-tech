-- ============================================================================
-- BUILD.TECH — Schéma de base de données Supabase (PostgreSQL)
-- ----------------------------------------------------------------------------
-- À exécuter dans Supabase : Dashboard → SQL Editor → New query → coller tout
-- ce fichier → Run. Voir README.md, partie "4. Configurer la base de données".
--
-- Principe de sécurité : Row Level Security (RLS) est activé sur TOUTES les
-- tables. Sans policy correspondante, une table avec RLS activé refuse tout
-- accès par défaut — la sécurité ne dépend donc jamais de ce que fait (ou ne
-- fait pas) le frontend.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. TABLES
-- ----------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  theme_preference text not null default 'system' check (theme_preference in ('light','dark','system')),
  suspended boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  is_owner boolean not null default false,
  status text not null default 'active' check (status in ('active','revoked')),
  added_at timestamptz not null default now(),
  added_by uuid references auth.users(id)
);

create table public.admin_invites (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  accepted boolean not null default false
);

create table public.component_categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.components (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  price numeric(10,2) not null default 0,
  negotiable boolean not null default false,
  available boolean not null default true,
  category_id uuid references public.component_categories(id) on delete set null,
  image_path text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text,
  context_type text not null default 'general' check (context_type in ('component','service','general')),
  context_id uuid,
  status text not null default 'open' check (status in ('open','closed')),
  unread_by_admin boolean not null default true,
  unread_by_user boolean not null default false,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id),
  sender_role text not null check (sender_role in ('user','admin')),
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

-- Journal des emails de notification déjà envoyés, pour éviter le spam
-- (utilisé uniquement par la Edge Function notify-new-message via service_role).
create table public.notifications_log (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  recipient_email text,
  sent_at timestamptz not null default now()
);

create table public.site_settings (
  key text primary key,
  value jsonb,
  updated_at timestamptz not null default now()
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

-- Index utiles (performance des listes / filtres les plus fréquents)
create index idx_conversations_user_id on public.conversations(user_id);
create index idx_conversations_status on public.conversations(status);
create index idx_messages_conversation_id on public.messages(conversation_id);
create index idx_components_category_id on public.components(category_id);
create index idx_components_available on public.components(available);

-- Vue : nombre de conversations par utilisateur (évite les requêtes N+1 dans
-- le panneau Utilisateurs). security_invoker = true : la vue respecte les
-- policies RLS de celui qui l'interroge (un admin voit tout, un utilisateur
-- ne verrait que sa propre ligne).
create view public.user_conversation_counts
with (security_invoker = true) as
select user_id, count(*)::int as conversation_count
from public.conversations
group by user_id;

grant select on public.user_conversation_counts to authenticated;

-- ----------------------------------------------------------------------------
-- 2. FONCTIONS UTILITAIRES (SECURITY DEFINER : exécutées avec les droits du
--    propriétaire de la fonction, pour vérifier le statut admin sans être
--    bloquées par les policies RLS de la table `admins` elle-même).
-- ----------------------------------------------------------------------------

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.admins a
    where a.user_id = uid and a.status = 'active'
  );
$$;

create or replace function public.is_owner(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.admins a
    where a.user_id = uid and a.is_owner = true and a.status = 'active'
  );
$$;

grant execute on function public.is_admin(uuid) to anon, authenticated;
grant execute on function public.is_owner(uuid) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. TRIGGERS
-- ----------------------------------------------------------------------------

-- À la création d'un compte Supabase Auth : créer sa ligne de profil, et
-- l'activer automatiquement comme administrateur si son email correspond à
-- une invitation en attente (voir Edge Function admin-actions, action "invite_admin").
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  has_invite boolean;
begin
  insert into public.profiles (id, email) values (new.id, new.email);

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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- À chaque nouveau message : met à jour la conversation parente (date du
-- dernier message, badges non-lu, réouverture automatique si l'utilisateur
-- écrit à nouveau après avoir fermé la conversation).
create or replace function public.handle_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.sender_role = 'user' then
    update public.conversations
       set last_message_at = new.created_at, unread_by_admin = true, status = 'open'
     where id = new.conversation_id;
  else
    update public.conversations
       set last_message_at = new.created_at, unread_by_user = true
     where id = new.conversation_id;
  end if;
  return new;
end;
$$;

create trigger on_message_created
  after insert on public.messages
  for each row execute function public.handle_new_message();

-- updated_at automatique pour components / services
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_components before update on public.components
  for each row execute function public.set_updated_at();
create trigger set_updated_at_services before update on public.services
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.admins enable row level security;
alter table public.admin_invites enable row level security;
alter table public.component_categories enable row level security;
alter table public.components enable row level security;
alter table public.services enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications_log enable row level security;
alter table public.site_settings enable row level security;
alter table public.push_subscriptions enable row level security;

-- ---- profiles ----
-- Un utilisateur peut mettre à jour UNIQUEMENT sa préférence de thème
-- (restriction au niveau colonne, en plus de la restriction au niveau ligne).
revoke update on public.profiles from authenticated;
grant update (theme_preference) on public.profiles to authenticated;

create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin(auth.uid()));

create policy "profiles_update_own_theme" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
-- Pas de policy INSERT/DELETE pour authenticated : la ligne est créée par le
-- trigger handle_new_user, et la suppression passe par la Edge Function
-- (auth.admin.deleteUser, avec cascade sur profiles).

-- ---- admins ----
-- Lecture : chacun peut vérifier SON PROPRE statut admin (utile pour la nav),
-- et les admins peuvent voir la liste complète. Aucune écriture directe
-- n'est autorisée : toute modification passe par la Edge Function
-- admin-actions (avec la clé service_role, qui contourne RLS).
create policy "admins_select_self_or_admin" on public.admins
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- ---- admin_invites ----
-- Aucune policy pour authenticated/anon : uniquement accessible via
-- service_role (Edge Function) et via le trigger handle_new_user.

-- ---- component_categories ----
create policy "categories_public_read" on public.component_categories
  for select to anon, authenticated
  using (true);
create policy "categories_admin_write" on public.component_categories
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ---- components ----
create policy "components_public_read" on public.components
  for select to anon, authenticated
  using (true);
create policy "components_admin_write" on public.components
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ---- services ----
create policy "services_public_read" on public.services
  for select to anon, authenticated
  using (true);
create policy "services_admin_write" on public.services
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ---- site_settings ----
create policy "settings_public_read" on public.site_settings
  for select to anon, authenticated
  using (true);
create policy "settings_admin_write" on public.site_settings
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ---- conversations ----
-- Un utilisateur ne peut modifier que le statut et les indicateurs non-lu
-- de SES PROPRES conversations ; jamais le sujet, le contexte ou le
-- destinataire (restriction au niveau colonne).
revoke update on public.conversations from authenticated;
grant update (status, unread_by_admin, unread_by_user) on public.conversations to authenticated;

create policy "conversations_select_own_or_admin" on public.conversations
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));

create policy "conversations_insert_own" on public.conversations
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "conversations_update_own_or_admin" on public.conversations
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()))
  with check (user_id = auth.uid() or public.is_admin(auth.uid()));

-- ---- messages ----
create policy "messages_select_participant" on public.messages
  for select to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.user_id = auth.uid() or public.is_admin(auth.uid()))
    )
  );

create policy "messages_insert_participant" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and (
      (sender_role = 'user' and exists (
        select 1 from public.conversations c
        where c.id = conversation_id and c.user_id = auth.uid()
      ))
      or
      (sender_role = 'admin' and public.is_admin(auth.uid()))
    )
  );
-- Pas de policy UPDATE/DELETE : les messages ne sont jamais modifiés ou
-- supprimés depuis le frontend, ni par les utilisateurs ni par les admins.

-- ---- notifications_log ----
-- Aucune policy pour authenticated/anon : uniquement service_role (Edge Function).

-- ---- push_subscriptions ----
create policy "push_subscriptions_owner" on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================================
-- Fin du schéma. Étape suivante : créer le bucket de stockage "components"
-- depuis le Dashboard (voir README, partie 5), PUIS exécuter
-- supabase/storage_policies.sql.
-- ============================================================================
