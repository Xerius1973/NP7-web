-- =====================================================================
-- NP7 — schéma Supabase sécurisé (idempotent : peut être relancé sans risque)
-- À exécuter dans Supabase > SQL Editor.
-- =====================================================================

-- 1) Données de synchronisation (santé : poids, repas, sport…) ---------
create table if not exists public.np7_user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- plafond de taille (évite qu'un compte stocke des volumes abusifs)
alter table public.np7_user_data drop constraint if exists np7_user_data_size;
alter table public.np7_user_data add constraint np7_user_data_size check (pg_column_size(data) < 1000000);

alter table public.np7_user_data enable row level security;

-- supprime TOUTES les anciennes policies (éventuellement trop permissives) puis recrée les bonnes
do $$
declare r record;
begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'np7_user_data' loop
    execute format('drop policy %I on public.np7_user_data', r.policyname);
  end loop;
end $$;

revoke all on public.np7_user_data from anon, authenticated;
grant select, insert, update, delete on public.np7_user_data to authenticated;

create policy "np7_user_data_select_own" on public.np7_user_data for select to authenticated using ((select auth.uid()) = user_id);
create policy "np7_user_data_insert_own" on public.np7_user_data for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "np7_user_data_update_own" on public.np7_user_data for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "np7_user_data_delete_own" on public.np7_user_data for delete to authenticated using ((select auth.uid()) = user_id);

-- 2) Achats et droits Premium -----------------------------------------
create table if not exists public.np7_purchases (
  stripe_checkout_session_id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  plan text not null check (plan in ('month','year','lifetime')),
  amount_total integer not null,
  currency text not null default 'eur',
  payment_status text not null,
  paid_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Conservation comptable : à la suppression d'un compte, la ligne d'achat est conservée mais
-- détachée de l'utilisateur (user_id = null) au lieu d'être effacée.
alter table public.np7_purchases alter column user_id drop not null;
do $$
declare c text;
begin
  select conname into c from pg_constraint
   where conrelid = 'public.np7_purchases'::regclass and contype = 'f' and confrelid = 'auth.users'::regclass;
  if c is not null then execute format('alter table public.np7_purchases drop constraint %I', c); end if;
end $$;
alter table public.np7_purchases add constraint np7_purchases_user_id_fkey foreign key (user_id) references auth.users(id) on delete set null;

create table if not exists public.np7_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null check (plan in ('month','year','lifetime')),
  expires_at timestamptz,
  active boolean not null default true,
  last_checkout_session_id text,
  updated_at timestamptz not null default now(),
  constraint np7_lifetime_no_expiry check (plan <> 'lifetime' or expires_at is null)
);

alter table public.np7_purchases enable row level security;
alter table public.np7_entitlements enable row level security;
revoke all on public.np7_purchases from anon, authenticated;
revoke all on public.np7_entitlements from anon, authenticated;
grant select on public.np7_entitlements to authenticated;
drop policy if exists "Users can read own NP7 entitlement" on public.np7_entitlements;
create policy "Users can read own NP7 entitlement" on public.np7_entitlements for select to authenticated using ((select auth.uid()) = user_id);

-- 3) Preuves de consentement (écriture seule : pas de modification ni de suppression par l'utilisateur) --
create table if not exists public.np7_consents (
  user_id uuid not null references auth.users(id) on delete cascade,
  version text not null,
  consented_at timestamptz not null default now(),
  primary key (user_id, version)
);
alter table public.np7_consents enable row level security;
revoke all on public.np7_consents from anon, authenticated;
grant select, insert on public.np7_consents to authenticated;
drop policy if exists "np7_consents_select_own" on public.np7_consents;
drop policy if exists "np7_consents_insert_own" on public.np7_consents;
create policy "np7_consents_select_own" on public.np7_consents for select to authenticated using ((select auth.uid()) = user_id);
create policy "np7_consents_insert_own" on public.np7_consents for insert to authenticated with check ((select auth.uid()) = user_id);

-- =====================================================================
-- VÉRIFICATIONS (à lancer après le script ci-dessus)
-- =====================================================================
-- a) Toutes les tables du schéma public doivent avoir rowsecurity = true :
--    select tablename, rowsecurity from pg_tables where schemaname = 'public' order by 1;
-- b) Les policies en place (uniquement celles de ce fichier) :
--    select tablename, policyname, cmd, roles, qual, with_check from pg_policies where schemaname = 'public' order by 1, 2;
-- c) Aucun droit pour le rôle anonyme :
--    select table_name, privilege_type from information_schema.role_table_grants
--     where grantee = 'anon' and table_schema = 'public';      -- doit renvoyer 0 ligne
