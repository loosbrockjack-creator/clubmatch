-- ClubMatch accounts: profiles, saved clubs, memberships, reports, avatars.
-- Applied to Supabase project "clubmatch" (bvttohfhctvjkywjftby).

-- Iowa State emails only. Enforced in the database, so no client can bypass it.
create or replace function public.enforce_iastate_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null or lower(new.email) not like '%@iastate.edu' then
    raise exception 'ClubMatch accounts require an @iastate.edu email'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_iastate_email on auth.users;
create trigger enforce_iastate_email
  before insert or update of email on auth.users
  for each row execute function public.enforce_iastate_email();

-- Profiles ---------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  major text check (char_length(major) <= 80),
  class_year text check (class_year in ('Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate', 'Alumni')),
  bio text check (char_length(bio) <= 280),
  links jsonb not null default '{}'::jsonb,
  avatar_url text,
  avatar_preset smallint check (avatar_preset between 0 and 11),
  preferences jsonb,
  visible boolean not null default true,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;

create policy "Read own or visible profiles" on public.profiles
  for select to authenticated
  using (visible or id = (select auth.uid()));

create policy "Update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Saved clubs (private) -------------------------------------------------------
create table public.saved_clubs (
  user_id uuid not null references auth.users (id) on delete cascade,
  club_slug text not null check (char_length(club_slug) <= 120),
  created_at timestamptz not null default now(),
  primary key (user_id, club_slug)
);

alter table public.saved_clubs enable row level security;

create policy "Own saves only" on public.saved_clubs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Memberships (self-join; role reserved for claimed clubs later) ---------------
create table public.memberships (
  user_id uuid not null references auth.users (id) on delete cascade,
  club_slug text not null check (char_length(club_slug) <= 120),
  role text not null default 'member' check (role in ('member', 'officer')),
  created_at timestamptz not null default now(),
  primary key (user_id, club_slug)
);

create index memberships_club_idx on public.memberships (club_slug);

alter table public.memberships enable row level security;

-- Anyone signed in sees memberships of visible profiles, plus their own.
create policy "Read memberships of visible profiles" on public.memberships
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.profiles p where p.id = user_id and p.visible)
  );

-- Students add and remove only themselves, and only as plain members.
create policy "Join as member" on public.memberships
  for insert to authenticated
  with check (user_id = (select auth.uid()) and role = 'member');

create policy "Leave own membership" on public.memberships
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Reports (write-only for students; reviewed in the dashboard) ----------------
create table public.reports (
  id bigint generated always as identity primary key,
  reporter uuid not null references auth.users (id) on delete cascade,
  target uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

create policy "File a report" on public.reports
  for insert to authenticated
  with check (reporter = (select auth.uid()));

-- Avatars bucket: public read, each student writes only their own folder -------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Upload own avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Replace own avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Delete own avatar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Trigger functions are not part of the public API.
revoke execute on function public.enforce_iastate_email() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
