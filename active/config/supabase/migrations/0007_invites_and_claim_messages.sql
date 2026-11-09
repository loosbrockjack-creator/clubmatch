-- Officer invites to good-fit students, and inbox messages for claim decisions.
-- Runs after 0006. Additive except for widening the audience check on this
-- feature's own club_campaigns table.

-- Campaign audiences gain two one-to-one kinds that don't count as campaigns.
alter table public.club_campaigns drop constraint club_campaigns_audience_check;
alter table public.club_campaigns add constraint club_campaigns_audience_check
  check (audience in ('members', 'interested', 'both', 'invite', 'system'));

-- Where a message's button goes, when it isn't the club page.
alter table public.club_campaigns
  add column link_path text check (link_path like '/%' and char_length(link_path) <= 200);
grant select (link_path) on public.club_campaigns to authenticated;

-- One row per student per club. No policies and no grants: only the server
-- touches it, after checking the officer and the student's good-fit status.
create table public.club_invites (
  club_slug text not null check (char_length(club_slug) <= 120),
  user_id uuid not null references auth.users (id) on delete cascade,
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (club_slug, user_id)
);

create index club_invites_day_idx on public.club_invites (club_slug, created_at);

alter table public.club_invites enable row level security;
revoke all on public.club_invites from anon, authenticated;

-- Invites and system messages must not use up a club's campaign allowance.
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
  if p_audience not in ('members', 'interested', 'both') then
    raise exception 'bad_audience' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('club_campaign:' || p_slug));

  select count(*) filter (where c.created_at > now() - interval '1 day'),
         count(*)
    into sent_day, sent_week
    from public.club_campaigns c
   where c.club_slug = p_slug
     and c.audience in ('members', 'interested', 'both')
     and c.created_at > now() - interval '7 days';

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

-- Records and delivers one invite. A student who muted the club gets no message,
-- but the row is written just the same, so the club can't tell the difference.
create or replace function public.send_club_invite(
  p_slug text,
  p_sender uuid,
  p_student uuid,
  p_subject text,
  p_body text,
  p_daily_limit integer default 20
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
  sent_day integer;
begin
  perform pg_advisory_xact_lock(hashtext('club_invite:' || p_slug));

  if exists (select 1 from public.club_invites i where i.club_slug = p_slug and i.user_id = p_student) then
    raise exception 'already_invited' using errcode = 'P0001';
  end if;

  select count(*) into sent_day
    from public.club_invites i
   where i.club_slug = p_slug and i.created_at > now() - interval '1 day';
  if sent_day >= p_daily_limit then
    raise exception 'rate_limit_day' using errcode = 'P0001';
  end if;

  insert into public.club_invites (club_slug, user_id, invited_by)
  values (p_slug, p_student, p_sender);

  if exists (select 1 from public.club_mutes x where x.user_id = p_student and x.club_slug = p_slug) then
    return;
  end if;

  insert into public.club_campaigns (club_slug, sender, subject, body, audience, recipient_count)
  values (p_slug, p_sender, p_subject, p_body, 'invite', 1)
  returning id into new_id;

  insert into public.campaign_recipients (campaign_id, user_id) values (new_id, p_student);
end;
$$;

revoke execute on function public.send_club_invite(text, uuid, uuid, text, text, integer)
  from public, anon, authenticated;
grant execute on function public.send_club_invite(text, uuid, uuid, text, text, integer)
  to service_role;

-- Tells the requester when a manual review is decided. A trigger, so it fires
-- when the owner changes the row in the Supabase dashboard, with no app running.
-- These ignore mutes: it's the answer to the student's own request.
create or replace function public.notify_claim_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
  subject text;
  message text;
begin
  if new.status is not distinct from old.status or new.status not in ('approved', 'rejected') then
    return new;
  end if;

  new.reviewed_at := now();

  if new.status = 'approved' then
    subject := 'You''re approved to claim this club';
    message := 'We confirmed you''re an officer. Open the claim page to finish up: $49 per semester, and your club''s page and admin panel turn on right away.';
  else
    subject := 'We couldn''t confirm your club claim';
    message := 'We couldn''t confirm you''re an officer of this club, so you weren''t charged. If that''s a mistake, you can send a new request from the claim page.';
  end if;

  insert into public.club_campaigns (club_slug, subject, body, audience, recipient_count, link_path)
  values (new.club_slug, subject, message, 'system', 1, '/clubs/' || new.club_slug || '/claim')
  returning id into new_id;

  insert into public.campaign_recipients (campaign_id, user_id) values (new_id, new.user_id);
  return new;
end;
$$;

revoke execute on function public.notify_claim_decision() from public, anon, authenticated;

create trigger club_claims_notify_decision
  before update of status on public.club_claims
  for each row execute function public.notify_claim_decision();
