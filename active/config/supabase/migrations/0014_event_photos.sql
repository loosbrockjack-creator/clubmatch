-- Event photos. Paste into the Supabase SQL editor.
-- One optional photo per event, stored in the existing public club-photos
-- bucket under <club_slug>/events/. The server only accepts URLs inside that
-- club's folder, so this column just holds the public URL.

alter table public.club_events
  add column if not exists photo text check (char_length(photo) <= 500);
