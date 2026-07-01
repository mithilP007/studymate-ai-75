-- Enable trigram extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add new columns to public.colleges if they don't exist
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS normalized_name TEXT;
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS first_letter TEXT;

-- Update default for verified column (for future records)
ALTER TABLE public.colleges ALTER COLUMN verified SET DEFAULT true;

-- Update existing rows to populate first_letter and normalized_name if any exist
UPDATE public.colleges 
SET 
  normalized_name = LOWER(TRIM(name)),
  first_letter = UPPER(SUBSTRING(TRIM(name) FROM 1 FOR 1))
WHERE normalized_name IS NULL OR first_letter IS NULL;

-- Remove duplicates before adding constraint (keeping only the first ID of duplicates)
DELETE FROM public.colleges a
USING public.colleges b
WHERE a.id > b.id 
  AND LOWER(TRIM(a.name)) = LOWER(TRIM(b.name))
  AND COALESCE(a.state, '') = COALESCE(b.state, '')
  AND COALESCE(a.district, '') = COALESCE(b.district, '');

-- Add unique constraint to allow safe upserts on these fields
ALTER TABLE public.colleges DROP CONSTRAINT IF EXISTS colleges_unique_keys;
ALTER TABLE public.colleges ADD CONSTRAINT colleges_unique_keys UNIQUE (normalized_name, state, district);

-- Create indexes on columns if not exists
CREATE INDEX IF NOT EXISTS colleges_name_idx ON public.colleges (name);
CREATE INDEX IF NOT EXISTS colleges_normalized_name_idx ON public.colleges (normalized_name);
CREATE INDEX IF NOT EXISTS colleges_state_idx ON public.colleges (state);
CREATE INDEX IF NOT EXISTS colleges_district_idx ON public.colleges (district);
CREATE INDEX IF NOT EXISTS colleges_institution_type_idx ON public.colleges (institution_type);
CREATE INDEX IF NOT EXISTS colleges_first_letter_idx ON public.colleges (first_letter);

-- Create trigram GIN index on name for fast fuzzy search
CREATE INDEX IF NOT EXISTS colleges_name_trgm_idx ON public.colleges USING gin (name gin_trgm_ops);

-- Set Row Level Security (RLS) policies on colleges
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;

-- Allow public read access to colleges table (for both anonymous and authenticated users)
DROP POLICY IF EXISTS "Colleges are publicly readable" ON public.colleges;
CREATE POLICY "Colleges are publicly readable" ON public.colleges 
  FOR SELECT TO public USING (true);

-- Allow authenticated users to submit new unverified colleges
DROP POLICY IF EXISTS "Authenticated insert unverified colleges" ON public.colleges;
CREATE POLICY "Authenticated insert unverified colleges" ON public.colleges 
  FOR INSERT TO authenticated WITH CHECK (verified = false AND source = 'User');

-- Restrict other write/insert/update/delete to service role only
DROP POLICY IF EXISTS "Admin write colleges" ON public.colleges;
CREATE POLICY "Admin write colleges" ON public.colleges 
  FOR ALL TO service_role USING (true) WITH CHECK (true);
