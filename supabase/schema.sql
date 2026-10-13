create table if not exists public.np7_purchases (
 stripe_checkout_session_id text primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 plan text not null check (plan in ('month','year','lifetime')),
 amount_total integer not null,
 currency text not null default 'eur',
 payment_status text not null,
 paid_at timestamptz not null,
 created_at timestamptz not null default now()
);
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
