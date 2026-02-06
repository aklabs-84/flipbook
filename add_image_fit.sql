-- Add image_fit column to pages table
alter table public.pages 
add column if not exists image_fit text default 'cover' check (image_fit in ('cover', 'contain'));
