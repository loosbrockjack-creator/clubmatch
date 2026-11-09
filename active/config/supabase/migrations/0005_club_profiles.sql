-- Club profiles: paid club pages, officer tools, analytics, campaigns, inbox.
-- Runs after 0001 to 0004. Additive only.
--
-- Security model: the browser never writes officer data directly. Anything an
-- officer does goes through a route handler that verifies the bearer token and
-- checks role plus active subscription, then uses the secret key. So most
-- tables here have row-level security on and no write policies at all. Students
-- get own-row policies only where they act for themselves (interest, mutes,
-- marking a message read).

-- Helpers -------------------------------------------------------------------

-- Club accounts. No policies: read and written only by server code, because the
-- row holds Stripe ids. The public learns a club's status from club_is_active().
create table public.club_accounts (
  club_slug text primary key check (char_length(club_slug) <= 120),
  status text not null default 'active'
    check (status in ('active', 'past_due', 'lapsed')),
  claimed_by uuid references auth.users (id) on delete set null,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  featured_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger club_accounts_touch before update on public.club_accounts
  for each row execute function public.touch_updated_at();

alter table public.club_accounts enable row level security;

-- Active means paid through the current period. The 3 day grace covers renewal
-- webhooks arriving late; a club whose webhook never comes still lapses by itself.
create or replace function public.club_is_active(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.club_accounts a
    where a.club_slug = p_slug
      and a.status in ('active', 'past_due')
      and coalesce(a.current_period_end, 'infinity'::timestamptz) > now() - interval '3 days'
  );
$$;

revoke execute on function public.club_is_active(text) from public;
grant execute on function public.club_is_active(text) to anon, authenticated, service_role;

-- Officer allowlist. Real exec data is loaded with
-- active/execution/scripts/load-officer-allowlist.mjs and never committed.
create table public.officer_allowlist (
  email text not null check (email = lower(email)),
  club_slug text not null check (char_length(club_slug) <= 120),
  created_at timestamptz not null default now(),
  primary key (email, club_slug)
);

alter table public.officer_allowlist enable row level security;

-- Manual review requests. Jack sets status in the Supabase dashboard.
create table public.club_claims (
  id uuid primary key default gen_random_uuid(),
  club_slug text not null check (char_length(club_slug) <= 120),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  role_title text not null check (char_length(role_title) between 1 and 80),
  note text check (char_length(note) <= 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create unique index club_claims_one_open
  on public.club_claims (club_slug, user_id) where status in ('pending', 'approved');
create index club_claims_status_idx on public.club_claims (status, created_at);

alter table public.club_claims enable row level security;

create policy "Read own claims" on public.club_claims
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Profile overlay: merged over data/clubs.json on the club page. Public read,
-- but only while the club is active, so a lapsed page reverts with data kept.
create table public.club_profiles (
  club_slug text primary key check (char_length(club_slug) <= 120),
  tagline text check (char_length(tagline) <= 160),
  description text check (char_length(description) <= 4000),
  meeting_info text check (char_length(meeting_info) <= 500),
  photos text[] not null default '{}' check (cardinality(photos) <= 6),
  links jsonb not null default '[]'::jsonb
    check (jsonb_typeof(links) = 'array' and jsonb_array_length(links) <= 6),
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger club_profiles_touch before update on public.club_profiles
  for each row execute function public.touch_updated_at();

alter table public.club_profiles enable row level security;

create policy "Read profiles of active clubs" on public.club_profiles
  for select to anon, authenticated
  using (public.club_is_active(club_slug));

-- Events -----------------------------------------------------------------------
create table public.club_events (
  id uuid primary key default gen_random_uuid(),
  club_slug text not null check (char_length(club_slug) <= 120),
  title text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 1000),
  location text check (char_length(location) <= 160),
  link text check (char_length(link) <= 500),
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create index club_events_club_idx on public.club_events (club_slug, starts_at);
create index club_events_start_idx on public.club_events (starts_at);

alter table public.club_events enable row level security;

create policy "Read events of active clubs" on public.club_events
  for select to anon, authenticated
  using (public.club_is_active(club_slug));

-- Featured row: only active clubs that opted in, and nothing else about them.
create or replace function public.featured_clubs()
returns table (club_slug text, tagline text)
language sql
stable
security definer
set search_path = ''
as $$
  select a.club_slug, p.tagline
  from public.club_accounts a
  left join public.club_profiles p on p.club_slug = a.club_slug
  where a.featured_opt_in and public.club_is_active(a.club_slug)
  order by a.club_slug;
$$;

revoke execute on function public.featured_clubs() from public;
grant execute on function public.featured_clubs() to anon, authenticated, service_role;

-- Analytics --------------------------------------------------------------------
-- No user ids. viewer_hash is an HMAC keyed per club with a server secret, so it
-- counts distinct students for one club but can't be joined across clubs or
-- reversed. No policies: only the server writes and reads, and only aggregates
-- leave it.
create table public.club_activity (
  id bigint generated always as identity primary key,
  club_slug text not null check (char_length(club_slug) <= 120),
  kind text not null check (kind in ('impression', 'view', 'save', 'interested', 'lead', 'join')),
  major text check (char_length(major) <= 80),
  academic_area text check (char_length(academic_area) <= 40),
  viewer_hash text not null check (char_length(viewer_hash) <= 64),
  day date not null default ((now() at time zone 'America/Chicago')::date),
  created_at timestamptz not null default now(),
  unique (club_slug, kind, viewer_hash, day)
);

create index club_activity_club_day_idx on public.club_activity (club_slug, day);

alter table public.club_activity enable row level security;

-- Leads: the "let the officers know" button. A student controls their own row.
create table public.club_interests (
  user_id uuid not null references public.profiles (id) on delete cascade,
  club_slug text not null check (char_length(club_slug) <= 120),
  created_at timestamptz not null default now(),
  primary key (user_id, club_slug)
);

create index club_interests_club_idx on public.club_interests (club_slug, created_at);

alter table public.club_interests enable row level security;

create policy "Read own interest" on public.club_interests
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Add own interest on active clubs" on public.club_interests
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.club_is_active(club_slug));

create policy "Remove own interest" on public.club_interests
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Campaigns and inbox ----------------------------------------------------------
create table public.club_campaigns (
  id uuid primary key default gen_random_uuid(),
  club_slug text not null check (char_length(club_slug) <= 120),
  sender uuid references auth.users (id) on delete set null,
  subject text not null check (char_length(subject) between 1 and 120),
  body text not null check (char_length(body) between 1 and 2000),
  audience text not null check (audience in ('members', 'interested', 'both')),
  recipient_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index club_campaigns_club_idx on public.club_campaigns (club_slug, created_at desc);

create table public.campaign_recipients (
  campaign_id uuid not null references public.club_campaigns (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  read_at timestamptz,
  primary key (campaign_id, user_id)
);

create index campaign_recipients_user_idx on public.campaign_recipients (user_id, read_at);

alter table public.club_campaigns enable row level security;
alter table public.campaign_recipients enable row level security;

-- A student sees only what was sent to them. Campaigns aren't readable by
-- subject, sender, or club otherwise. The sender column stays server-only.
create or replace function public.received_campaign(p_campaign uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.campaign_recipients r
    where r.campaign_id = p_campaign and r.user_id = (select auth.uid())
  );
$$;

revoke execute on function public.received_campaign(uuid) from public;
grant execute on function public.received_campaign(uuid) to authenticated, service_role;

create policy "Read campaigns sent to me" on public.club_campaigns
  for select to authenticated
  using (public.received_campaign(id));

create policy "Read own inbox rows" on public.campaign_recipients
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Mark own inbox rows read" on public.campaign_recipients
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.club_campaigns from anon, authenticated;
grant select (id, club_slug, subject, body, created_at) on public.club_campaigns to authenticated;
revoke all on public.campaign_recipients from anon, authenticated;
grant select on public.campaign_recipients to authenticated;
grant update (read_at) on public.campaign_recipients to authenticated;

create table public.club_mutes (
  user_id uuid not null references auth.users (id) on delete cascade,
  club_slug text not null check (char_length(club_slug) <= 120),
  created_at timestamptz not null default now(),
  primary key (user_id, club_slug)
);

alter table public.club_mutes enable row level security;

create policy "Own mutes only" on public.club_mutes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Sends a campaign in one transaction: rate limit, recipients, message. The lock
-- serializes sends per club so two tabs can't slip past the limit together.
create or replace function public.send_club_campaign(
  p_slug text,
  p_sender uuid,
  p_subject text,
  p_body text,
  p_audience text,
  p_daily_limit integer default 2,
  p_weekly_limit integer default 5
)
returns table (campaign_id uuid, recipients integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
  sent_day integer;
  sent_week integer;
  total integer;
begin
  perform pg_advisory_xact_lock(hashtext('club_campaign:' || p_slug));

  select count(*) filter (where c.created_at > now() - interval '1 day'),
         count(*)
    into sent_day, sent_week
    from public.club_campaigns c
   where c.club_slug = p_slug and c.created_at > now() - interval '7 days';

  if sent_day >= p_daily_limit then
    raise exception 'rate_limit_day' using errcode = 'P0001';
  end if;
  if sent_week >= p_weekly_limit then
    raise exception 'rate_limit_week' using errcode = 'P0001';
  end if;

  insert into public.club_campaigns (club_slug, sender, subject, body, audience)
  values (p_slug, p_sender, p_subject, p_body, p_audience)
  returning id into new_id;

  insert into public.campaign_recipients (campaign_id, user_id)
  select new_id, t.user_id
  from (
    select m.user_id from public.memberships m
     where p_audience in ('members', 'both') and m.club_slug = p_slug
    union
    select i.user_id from public.club_interests i
     where p_audience in ('interested', 'both') and i.club_slug = p_slug
  ) t
  where t.user_id is distinct from p_sender
    and not exists (
      select 1 from public.club_mutes x where x.user_id = t.user_id and x.club_slug = p_slug
    );

  get diagnostics total = row_count;
  if total = 0 then
    raise exception 'no_recipients' using errcode = 'P0001';
  end if;

  update public.club_campaigns set recipient_count = total where id = new_id;
  return query select new_id, total;
end;
$$;

revoke execute on function public.send_club_campaign(text, uuid, text, text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.send_club_campaign(text, uuid, text, text, text, integer, integer)
  to service_role;

-- Club photos: public read, written only by the server after an officer check.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('club-photos', 'club-photos', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
