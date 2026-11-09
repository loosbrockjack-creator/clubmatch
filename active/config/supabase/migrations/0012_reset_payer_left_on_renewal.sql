-- A new payer's renewal must not inherit the "payer left" flag from 0011.
-- Without this, if the last paying officer deleted their account and another
-- officer renewed before the daily cron ran, the cron set cancel_at_period_end
-- on the new subscription and it silently stopped renewing.
-- Same function as 0009, with needs_period_end_cancel cleared on adoption.
create or replace function public.apply_club_subscription(
  p_slug text,
  p_sub text,
  p_user uuid,
  p_customer text,
  p_status text,
  p_period_end timestamptz,
  p_ending boolean,
  p_replace_dead text default null
)
returns table (outcome text, other_sub text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  acct public.club_accounts%rowtype;
begin
  perform pg_advisory_xact_lock(hashtext('club_account:' || p_slug));

  select * into acct from public.club_accounts a where a.club_slug = p_slug;

  if found and acct.stripe_subscription_id = p_sub then
    if acct.needs_stripe_cancel then
      return query select 'cancel_self'::text, null::text;
      return;
    end if;
    update public.club_accounts a
       set status = p_status,
           current_period_end = p_period_end,
           cancel_at_period_end = p_ending
     where a.club_slug = p_slug;
    return query select 'current'::text, null::text;
    return;
  end if;

  -- p_replace_dead is set only after Stripe confirmed the recorded one has ended.
  if found
     and acct.stripe_subscription_id is not null
     and public.club_is_active(p_slug)
     and p_replace_dead is distinct from acct.stripe_subscription_id then
    return query select 'duplicate'::text, acct.stripe_subscription_id;
    return;
  end if;

  insert into public.club_accounts as a (
    club_slug, status, claimed_by, stripe_customer_id, stripe_subscription_id,
    current_period_end, cancel_at_period_end, needs_stripe_cancel
  )
  values (p_slug, p_status, p_user, p_customer, p_sub, p_period_end, p_ending, false)
  on conflict (club_slug) do update
    set status = excluded.status,
        claimed_by = excluded.claimed_by,
        stripe_customer_id = excluded.stripe_customer_id,
        stripe_subscription_id = excluded.stripe_subscription_id,
        current_period_end = excluded.current_period_end,
        cancel_at_period_end = excluded.cancel_at_period_end,
        needs_stripe_cancel = false,
        needs_period_end_cancel = false;

  -- The payer may have deleted their account between paying and this event.
  if p_user is not null and exists (select 1 from auth.users u where u.id = p_user) then
    insert into public.memberships as m (user_id, club_slug, role, verified)
    values (p_user, p_slug, 'officer', true)
    on conflict (user_id, club_slug) do update set role = 'officer', verified = true;
  end if;

  insert into public.club_profiles (club_slug) values (p_slug) on conflict (club_slug) do nothing;

  -- The replaced subscription, so the caller can make sure it stops billing.
  return query select 'adopted'::text, acct.stripe_subscription_id;
end;
$$;

revoke execute on function public.apply_club_subscription(text, text, uuid, text, text, timestamptz, boolean, text)
  from public, anon, authenticated;
grant execute on function public.apply_club_subscription(text, text, uuid, text, text, timestamptz, boolean, text)
  to service_role;
