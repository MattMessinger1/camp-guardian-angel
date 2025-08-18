-- Enable unaccent extension
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Add fingerprint column to children table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='children' AND column_name='fingerprint') THEN
        ALTER TABLE public.children ADD COLUMN fingerprint TEXT;
    END IF;
END $$;

-- Add optional admin override fields (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='children' AND column_name='duplicate_of_child_id') THEN
        ALTER TABLE public.children ADD COLUMN duplicate_of_child_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='children' AND column_name='admin_override_reason') THEN
        ALTER TABLE public.children ADD COLUMN admin_override_reason TEXT;
    END IF;
END $$;

-- Create shared utility function for computing child fingerprints
CREATE OR REPLACE FUNCTION public.compute_child_fingerprint(p_name TEXT, p_dob DATE)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  normalized_name TEXT;
  dob_iso TEXT;
BEGIN
  -- Normalize name: unaccent, lowercase, remove non-alphanumeric, trim
  normalized_name := regexp_replace(
    lower(unaccent(p_name)),
    '[^a-z0-9]',
    '',
    'g'
  );
  
  -- Format date as ISO string (YYYY-MM-DD)
  dob_iso := p_dob::TEXT;
  
  -- Return SHA256 hash of normalized_name|dob_iso
  RETURN encode(
    digest(normalized_name || '|' || dob_iso, 'sha256'),
    'hex'
  );
END;
$$;

-- Backfill fingerprints for existing children
UPDATE public.children 
SET fingerprint = compute_child_fingerprint(name, dob)
WHERE fingerprint IS NULL;

-- Handle duplicates by marking older ones as duplicates of newer ones
WITH duplicates AS (
  SELECT 
    id,
    fingerprint,
    ROW_NUMBER() OVER (PARTITION BY fingerprint ORDER BY created_at ASC) as rn
  FROM public.children
  WHERE fingerprint IS NOT NULL
),
first_child AS (
  SELECT id, fingerprint 
  FROM duplicates 
  WHERE rn = 1
),
duplicate_children AS (
  SELECT d.id, f.id as original_id
  FROM duplicates d
  JOIN first_child f ON d.fingerprint = f.fingerprint
  WHERE d.rn > 1
)
UPDATE public.children 
SET duplicate_of_child_id = dc.original_id,
    admin_override_reason = 'System detected duplicate during fingerprint migration'
FROM duplicate_children dc
WHERE children.id = dc.id;

-- Delete duplicate records (keeping the original)
DELETE FROM public.children 
WHERE duplicate_of_child_id IS NOT NULL;

-- Make fingerprint NOT NULL after cleanup
ALTER TABLE public.children ALTER COLUMN fingerprint SET NOT NULL;

-- Create unique index on fingerprint
CREATE UNIQUE INDEX IF NOT EXISTS uniq_children_fingerprint ON public.children(fingerprint);

-- Add foreign key for duplicate_of_child_id (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_children_duplicate_of') THEN
        ALTER TABLE public.children ADD CONSTRAINT fk_children_duplicate_of 
        FOREIGN KEY (duplicate_of_child_id) REFERENCES public.children(id);
    END IF;
END $$;

-- Create trigger to automatically set fingerprint on insert/update
CREATE OR REPLACE FUNCTION public.set_child_fingerprint()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.fingerprint := compute_child_fingerprint(NEW.name, NEW.dob);
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_set_child_fingerprint ON public.children;
CREATE TRIGGER trigger_set_child_fingerprint
  BEFORE INSERT OR UPDATE OF name, dob ON public.children
  FOR EACH ROW
  EXECUTE FUNCTION public.set_child_fingerprint();