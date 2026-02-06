-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- BOOKS Table
create table public.books (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  is_rtl boolean default false,
  password_hash text,
  is_public boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- PAGES Table
create table public.pages (
  id uuid primary key default uuid_generate_v4(),
  book_id uuid not null references public.books(id) on delete cascade,
  page_number integer not null,
  media_url text,
  media_type text check (media_type in ('image', 'video')),
  text_layers jsonb default '[]'::jsonb,
  layout_preset text default 'full',
  created_at timestamptz default now()
);

-- Row Level Security (RLS)
alter table public.books enable row level security;
alter table public.pages enable row level security;

-- Policies for BOOKS
create policy "Users can view their own books"
  on public.books for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own books"
  on public.books for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own books"
  on public.books for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own books"
  on public.books for delete
  using ( auth.uid() = user_id );

-- Policies for PAGES
create policy "Users can view pages of their books"
  on public.pages for select
  using ( exists (
    select 1 from public.books
    where books.id = pages.book_id
    and books.user_id = auth.uid()
  ));

create policy "Users can insert pages to their books"
  on public.pages for insert
  with check ( exists (
    select 1 from public.books
    where books.id = book_id
    and books.user_id = auth.uid()
  ));

create policy "Users can update pages of their books"
  on public.pages for update
  using ( exists (
    select 1 from public.books
    where books.id = pages.book_id
    and books.user_id = auth.uid()
  ));

create policy "Users can delete pages of their books"
  on public.pages for delete
  using ( exists (
    select 1 from public.books
    where books.id = pages.book_id
    and books.user_id = auth.uid()
  ));
