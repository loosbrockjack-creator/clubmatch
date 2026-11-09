-- Profile links are student-written and can be set straight from the client.
-- Rendering already filters them; this stops a javascript: link at the door.

-- Existing rows first, or any later edit to those profiles would start failing.
-- Bare addresses like "mysite.com" gain https://, anything else unusable is dropped.
update public.profiles p
set links = coalesce((
  select jsonb_agg(
    case
      when (e.value ->> 'url') ~* '^https?://' then e.value
      else jsonb_set(e.value, '{url}', to_jsonb('https://' || (e.value ->> 'url')))
    end
    order by e.ordinality
  )
  from jsonb_array_elements(p.links) with ordinality as e(value, ordinality)
  where jsonb_typeof(e.value) = 'object'
    and (e.value ->> 'url') !~ '[[:space:]]'
    and ((e.value ->> 'url') ~* '^https?://[^[:space:]]+$'
         or (e.value ->> 'url') ~* '^[a-z0-9-]+(\.[a-z0-9-]+)+([/?#].*)?$')
), '[]'::jsonb)
where exists (
  select 1 from jsonb_array_elements(p.links) e(value)
  where jsonb_typeof(e.value) <> 'object'
     or coalesce(e.value ->> 'url', '') !~* '^https?://[^[:space:]]+$'
);

create or replace function public.links_are_http(p_links jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_links) = 'array' and not exists (
    select 1 from jsonb_array_elements(p_links) e(value)
    where jsonb_typeof(e.value) <> 'object'
       or coalesce(e.value ->> 'url', '') !~* '^https?://[^[:space:]]+$'
  );
$$;

alter table public.profiles
  add constraint profiles_links_http check (public.links_are_http(links));
