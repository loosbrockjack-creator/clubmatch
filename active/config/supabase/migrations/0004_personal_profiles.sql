-- Personal profiles. Run after 0001 to 0003.
--
-- interests_chosen records that a student has saved their interest chips, even
-- if they saved none. Without it, a student who deliberately clears every chip
-- would see them prefilled from the quiz again on their next visit.
alter table public.profiles
  add column if not exists interests_chosen boolean not null default false;

update public.profiles
set interests_chosen = true
where cardinality(interests) > 0 and not interests_chosen;
