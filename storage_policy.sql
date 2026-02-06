-- 1. Create the 'uploads' bucket (if it doesn't exist)
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;

-- 2. Drop existing policies to avoid conflicts (Optional, helpful for clean reset)a
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Authenticated users can upload" on storage.objects;
drop policy if exists "Users can update own files" on storage.objects;
drop policy if exists "Users can delete own files" on storage.objects;

-- 3. Create RLS Policies for 'uploads' bucket

-- Allow public access to view files (since it's a public bucket)
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'uploads' );

-- Allow authenticated users to upload files
create policy "Authenticated users can upload"
on storage.objects for insert
with check (
  bucket_id = 'uploads'
  and auth.role() = 'authenticated'
);

-- Allow users to update their own files
create policy "Users can update own files"
on storage.objects for update
using (
  bucket_id = 'uploads'
  and auth.uid() = owner
);

-- Allow users to delete their own files
create policy "Users can delete own files"
on storage.objects for delete
using (
  bucket_id = 'uploads'
  and auth.uid() = owner
);
