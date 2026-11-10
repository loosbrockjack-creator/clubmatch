-- Claim decision inbox messages without pricing. Paste into the Supabase SQL editor.
-- The claim page link stays: opening it turns the club on for an approved officer.

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
    subject := 'Your club''s admin panel is ready';
    message := 'We confirmed you''re an officer. Open the claim page to go to your admin panel and add your description, photos, and first event.';
  else
    subject := 'We couldn''t confirm your club claim';
    message := 'We couldn''t confirm you''re an officer of this club. If that''s a mistake, you can send a new request from the claim page.';
  end if;

  insert into public.club_campaigns (club_slug, subject, body, audience, recipient_count, link_path)
  values (new.club_slug, subject, message, 'system', 1, '/clubs/' || new.club_slug || '/claim')
  returning id into new_id;

  insert into public.campaign_recipients (campaign_id, user_id) values (new_id, new.user_id);
  return new;
end;
$$;

