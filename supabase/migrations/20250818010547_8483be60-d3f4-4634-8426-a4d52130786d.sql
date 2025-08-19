-- Add fingerprint column to children table
ALTER TABLE public.children ADD COLUMN fingerprint TEXT;

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
  -- Normalize name: NFKD, strip diacritics, lowercase, remove non-alphanumeric, trim
  normalized_name := regexp_replace(
    lower(
      unaccent(
        normalize(p_name, 'NFKD')
      )
    ),
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

-- Make fingerprint NOT NULL after backfill
ALTER TABLE public.children ALTER COLUMN fingerprint SET NOT NULL;

-- Create unique index on fingerprint
CREATE UNIQUE INDEX uniq_children_fingerprint ON public.children(fingerprint);

-- Add optional admin override fields
ALTER TABLE public.children ADD COLUMN duplicate_of_child_id UUID;
ALTER TABLE public.children ADD COLUMN admin_override_reason TEXT;

-- Add foreign key for duplicate_of_child_id
ALTER TABLE public.children ADD CONSTRAINT fk_children_duplicate_of 
  FOREIGN KEY (duplicate_of_child_id) REFERENCES public.children(id);

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

CREATE TRIGGER trigger_set_child_fingerprint
  BEFORE INSERT OR UPDATE OF name, dob ON public.children
  FOR EACH ROW
  EXECUTE FUNCTION public.set_child_fingerprint();