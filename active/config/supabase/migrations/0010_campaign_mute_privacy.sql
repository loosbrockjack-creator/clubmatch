-- A club must not be able to tell who muted it. The count and the send behave as
-- if every student in the audience received the message; muted students are
-- skipped silently. Only a truly empty audience is refused.
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

  create temporary table audience_members on commit drop as
  select t.user_id
  from (
    select m.user_id from public.memberships m
     where p_audience in ('members', 'both') and m.club_slug = p_slug
    union
    select i.user_id from public.club_interests i
     where p_audience in ('interested', 'both') and i.club_slug = p_slug
  ) t
  where t.user_id is distinct from p_sender;

  select count(*) into total from audience_members;
  if total = 0 then
    raise exception 'no_recipients' using errcode = 'P0001';
  end if;

  insert into public.club_campaigns (club_slug, sender, subject, body, audience, recipient_count)
  values (p_slug, p_sender, p_subject, p_body, p_audience, total)
  returning id into new_id;

  insert into public.campaign_recipients (campaign_id, user_id)
  select new_id, a.user_id
  from audience_members a
  where not exists (
    select 1 from public.club_mutes x where x.user_id = a.user_id and x.club_slug = p_slug
  );

  return query select new_id, total;
end;
$$;
