-- Shared foundation for the club profiles + personal profiles build.
-- Both features build on these columns; neither feature changes them.

-- Profiles: public interests, "looking for" status, club discoverability ----
alter table public.profiles
  add column interests text[] not null default '{}'
    check (cardinality(interests) <= 12),
  add column looking_for text
    check (looking_for in ('club', 'teammates', 'study_group', 'friends', 'browsing')),
  add column discoverable boolean not null default true,
  add column policy_notice_seen boolean not null default false;

-- Links: {linkedin, instagram, website} object -> ordered array of {url, label?}, max 5.
update public.profiles p
set links = coalesce((
  select jsonb_agg(jsonb_build_object('url', v.url) order by v.ord)
  from (
    select 1 as ord, nullif(p.links ->> 'linkedin', '') as url
    union all
    select 2, case when coalesce(p.links ->> 'instagram', '') <> ''
                   then 'https://instagram.com/' || (p.links ->> 'instagram') end
    union all
    select 3, nullif(p.links ->> 'website', '')
  ) v
  where v.url is not null
), '[]'::jsonb)
where jsonb_typeof(p.links) = 'object';

alter table public.profiles
  alter column links set default '[]'::jsonb,
  add constraint profiles_links_array
    check (jsonb_typeof(links) = 'array' and jsonb_array_length(links) <= 5);

-- Quiz answers move to a private table. Visible profile rows were readable in
-- full by any signed-in student, which exposed preferences. Now only the
-- owner (and server code using the secret key) can read them.
create table public.profile_private (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  preferences jsonb,
  updated_at timestamptz not null default now()
);

insert into public.profile_private (user_id, preferences)
select id, preferences from public.profiles
on conflict (user_id) do nothing;

alter table public.profiles drop column preferences;

create trigger profile_private_touch before update on public.profile_private
  for each row execute function public.touch_updated_at();

alter table public.profile_private enable row level security;

create policy "Own private profile only" on public.profile_private
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.profile_private (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Memberships: officers can verify a self-declared member (feature 1 adds the
-- officer policies). Students can never verify themselves.
alter table public.memberships
  add column verified boolean not null default false;

drop policy "Join as member" on public.memberships;
create policy "Join as member" on public.memberships
  for insert to authenticated
  with check (user_id = (select auth.uid()) and role = 'member' and not verified);
