-- Create geocode cache table
CREATE TABLE public.geocode_cache (
  query text PRIMARY KEY,
  lat double precision,
  lng double precision,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.geocode_cache ENABLE ROW LEVEL SECURITY;

-- Create policies for geocode cache
CREATE POLICY "Geocode cache is readable by everyone" 
ON public.geocode_cache 
FOR SELECT 
USING (true);

-- Edge functions can manage geocode cache
CREATE POLICY "Edge functions can manage geocode cache" 
ON public.geocode_cache 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_geocode_cache_updated_at ON public.geocode_cache(updated_at);

-- Add trigger to update updated_at
CREATE TRIGGER update_geocode_cache_updated_at
  BEFORE UPDATE ON public.geocode_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();