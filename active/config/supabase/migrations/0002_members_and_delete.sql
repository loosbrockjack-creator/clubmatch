-- Lets the API embed a member's profile when listing a club's members.
alter table public.memberships
  add constraint memberships_profile_fk
  foreign key (user_id) references public.profiles (id) on delete cascade;

-- Self-serve account deletion. Cascades remove profile, saves, memberships and
-- reports. Avatar files are removed by the client first (storage objects
-- can't be deleted from SQL).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
