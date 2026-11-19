-- Daily view counts for each club's claim page, for the owner dashboard (/admin).
-- Counts only: no user id, no visitor id. Only the server writes, through
-- log_claim_view, after its own rate limit. Additive.

create table public.claim_page_views (
  club_slug text not null check (char_length(club_slug) between 1 and 120),
  day date not null default ((now() at time zone 'America/Chicago')::date),
  views integer not null default 0 check (views >= 0),
  primary key (club_slug, day)
);

alter table public.claim_page_views enable row level security;
revoke all on public.claim_page_views from anon, authenticated;

create or replace function public.log_claim_view(p_slug text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.claim_page_views (club_slug, views)
  values (p_slug, 1)
  on conflict (club_slug, day)
  do update set views = public.claim_page_views.views + 1;
$$;

revoke all on function public.log_claim_view(text) from public, anon, authenticated;
grant execute on function public.log_claim_view(text) to service_role;
