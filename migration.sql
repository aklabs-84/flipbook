-- Add book_type column to books table
ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS book_type text DEFAULT 'image';

-- Update existing books to be 'image' type by default (or 'storybook' if you prefer)
UPDATE public.books 
SET book_type = 'image' 
WHERE book_type IS NULL;

-- Make it not null if you want strict typing
-- ALTER TABLE public.books ALTER COLUMN book_type SET NOT NULL;
