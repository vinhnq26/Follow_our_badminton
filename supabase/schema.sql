create extension if not exists pgcrypto;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint members_name_not_blank check (length(trim(name)) > 0)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  venue text not null,
  address text not null,
  court_number text not null,
  income_items jsonb not null default '[]'::jsonb,
  expense_items jsonb not null default '[]'::jsonb,
  attendance_ids jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matches_venue_not_blank check (length(trim(venue)) > 0),
  constraint matches_address_not_blank check (length(trim(address)) > 0),
  constraint matches_court_not_blank check (length(trim(court_number)) > 0),
  constraint matches_income_items_array check (jsonb_typeof(income_items) = 'array'),
  constraint matches_expense_items_array check (jsonb_typeof(expense_items) = 'array'),
  constraint matches_attendance_ids_array check (jsonb_typeof(attendance_ids) = 'array')
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists matches_starts_at_idx on public.matches(starts_at desc);
create index if not exists members_active_idx on public.members(active);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists members_set_updated_at on public.members;
create trigger members_set_updated_at
before update on public.members
for each row execute function public.set_updated_at();

drop trigger if exists matches_set_updated_at on public.matches;
create trigger matches_set_updated_at
before update on public.matches
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid() and active = true
  );
$$;

create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin();
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_current_user_admin() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_current_user_admin() to anon, authenticated;

grant select on public.members, public.matches to anon, authenticated;
grant insert, update, delete on public.members, public.matches to authenticated;

alter table public.members enable row level security;
alter table public.matches enable row level security;
alter table public.admin_users enable row level security;

drop policy if exists members_public_read on public.members;
create policy members_public_read on public.members
for select to anon, authenticated using (true);

drop policy if exists members_admin_insert on public.members;
create policy members_admin_insert on public.members
for insert to authenticated with check (public.is_admin());

drop policy if exists members_admin_update on public.members;
create policy members_admin_update on public.members
for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists members_admin_delete on public.members;
create policy members_admin_delete on public.members
for delete to authenticated using (public.is_admin());

drop policy if exists matches_public_read on public.matches;
create policy matches_public_read on public.matches
for select to anon, authenticated using (true);

drop policy if exists matches_admin_insert on public.matches;
create policy matches_admin_insert on public.matches
for insert to authenticated with check (public.is_admin());

drop policy if exists matches_admin_update on public.matches;
create policy matches_admin_update on public.matches
for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists matches_admin_delete on public.matches;
create policy matches_admin_delete on public.matches
for delete to authenticated using (public.is_admin());

-- Add the first admin after creating the user in Supabase Auth:
-- insert into public.admin_users (user_id) values ('AUTH_USER_UUID');

insert into public.members (id, name, active)
values
  ('10000000-0000-4000-8000-000000000001', 'Nguyễn Hoài Nhân', true),
  ('10000000-0000-4000-8000-000000000002', 'Nguyễn Thị Ý', true),
  ('10000000-0000-4000-8000-000000000003', 'Phạm Ngọc Bích Trâm', true),
  ('10000000-0000-4000-8000-000000000004', 'Trần Thị Thân Thương', true),
  ('10000000-0000-4000-8000-000000000005', 'Bạch Thị Mỹ Hạnh', true),
  ('10000000-0000-4000-8000-000000000006', 'Hồ Bảo Vy', true),
  ('10000000-0000-4000-8000-000000000007', 'Trần Thái Xông', true),
  ('10000000-0000-4000-8000-000000000008', 'Danh Minh Hoà', true),
  ('10000000-0000-4000-8000-000000000009', 'Lê Thị Gia Hân', true),
  ('10000000-0000-4000-8000-000000000010', 'Phan Nguyễn Anh Vinh', true),
  ('10000000-0000-4000-8000-000000000011', 'Nguyễn Quốc Vinh', true)
on conflict (id) do nothing;

-- Optional Realtime support for shared open tabs/devices.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'members'
  ) then
    alter publication supabase_realtime add table public.members;
  end if;
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'matches'
  ) then
    alter publication supabase_realtime add table public.matches;
  end if;
end;
$$;
