-- Round 2 hardening for club profiles. Runs after 0005. Additive only.

-- Signed-out analytics can't be verified, so they're kept apart from the numbers
-- clubs pay for. False means a verified, signed-in student.
alter table public.club_activity
  add column anonymous boolean not null default false;

-- Set when a club loses its last officer through account deletion. The database
-- can't reach Stripe, so /api/cron/club-billing cancels these subscriptions.
alter table public.club_accounts
  add column needs_stripe_cancel boolean not null default false;

create index club_accounts_needs_cancel_idx
  on public.club_accounts (club_slug) where needs_stripe_cancel;

-- A paid club always keeps an officer. A direct delete of the last officer is
-- refused. Deleting an account has to keep working, so a cascade is let through:
-- the club goes back to unclaimed straight away, so a new officer can claim it,
-- and its subscription is queued for cancellation so no one is charged again.
create or replace function public.protect_last_officer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role <> 'officer' or not public.club_is_active(old.club_slug) then
    return old;
  end if;

  -- Serializes two officers removing each other at the same moment.
  perform 1 from public.club_accounts a where a.club_slug = old.club_slug for update;

  if exists (
    select 1 from public.memberships m
    where m.club_slug = old.club_slug and m.role = 'officer' and m.user_id <> old.user_id
  ) then
    return old;
  end if;

  -- Depth 1 is a direct delete. Deeper means a foreign key cascade fired this
  -- trigger, which only happens when the account itself is being deleted.
  if pg_trigger_depth() > 1 then
    update public.club_accounts
       set status = 'lapsed', needs_stripe_cancel = true
     where club_slug = old.club_slug;
    return old;
  end if;

  raise exception 'last_officer' using errcode = 'P0001';
end;
$$;

revoke execute on function public.protect_last_officer() from public, anon, authenticated;

create trigger memberships_protect_last_officer
  before delete on public.memberships
  for each row execute function public.protect_last_officer();
