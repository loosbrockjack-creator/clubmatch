-- When the student who pays for a club deletes their account while other officers
-- remain, the foreign key clears claimed_by. Their card must not be charged again,
-- so the subscription is queued to end at its period end. The club stays on for
-- what was paid, and another officer can renew with their own card.
alter table public.club_accounts
  add column needs_period_end_cancel boolean not null default false;

create or replace function public.flag_payer_gone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.needs_period_end_cancel := true;
  return new;
end;
$$;

revoke execute on function public.flag_payer_gone() from public, anon, authenticated;

create trigger club_accounts_payer_gone
  before update of claimed_by on public.club_accounts
  for each row
  when (old.claimed_by is not null and new.claimed_by is null)
  execute function public.flag_payer_gone();
