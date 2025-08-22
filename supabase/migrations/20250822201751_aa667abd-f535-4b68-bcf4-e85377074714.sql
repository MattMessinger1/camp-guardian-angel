-- Create browser sessions table for managing automated browser instances
CREATE TABLE public.browser_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  browser_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'idle', 'closed', 'error')),
  camp_provider_id UUID,
  parent_id UUID,
  compliance_status TEXT NOT NULL DEFAULT 'pending' CHECK (compliance_status IN ('approved', 'pending', 'rejected')),
  current_url TEXT,
  error_count INTEGER NOT NULL DEFAULT 0,
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create TOS compliance cache table
CREATE TABLE public.tos_compliance_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  hostname TEXT GENERATED ALWAYS AS (
    CASE 
      WHEN url ~ '^https?://' THEN 
        regexp_replace(
          regexp_replace(url, '^https?://', ''),
          '/.*$', ''
        )
      ELSE url
    END
  ) STORED,
  analysis_result JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(url)
);

-- Create camp provider partnerships table
CREATE TABLE public.camp_provider_partnerships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID,
  hostname TEXT NOT NULL,
  organization_name TEXT,
  status TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('partner', 'approved', 'pending', 'rejected', 'unknown')),
  partnership_type TEXT CHECK (partnership_type IN ('official_api', 'approved_automation', 'manual_only')),
  api_endpoint TEXT,
  contact_email TEXT,
  last_contact TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(hostname)
);

-- Enable Row Level Security
ALTER TABLE public.browser_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tos_compliance_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camp_provider_partnerships ENABLE ROW LEVEL SECURITY;

-- Create policies for browser_sessions
CREATE POLICY "Users can view their own browser sessions" 
ON public.browser_sessions 
FOR SELECT 
USING (auth.uid() = parent_id);

CREATE POLICY "Users can create their own browser sessions" 
ON public.browser_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Users can update their own browser sessions" 
ON public.browser_sessions 
FOR UPDATE 
USING (auth.uid() = parent_id);

CREATE POLICY "System can manage all browser sessions" 
ON public.browser_sessions 
FOR ALL 
USING (auth.role() = 'service_role');

-- Create policies for TOS compliance cache (readable by all authenticated users)
CREATE POLICY "Authenticated users can view TOS compliance cache" 
ON public.tos_compliance_cache 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "System can manage TOS compliance cache" 
ON public.tos_compliance_cache 
FOR ALL 
USING (auth.role() = 'service_role');

-- Create policies for camp provider partnerships (readable by authenticated users)
CREATE POLICY "Authenticated users can view partnerships" 
ON public.camp_provider_partnerships 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "System can manage partnerships" 
ON public.camp_provider_partnerships 
FOR ALL 
USING (auth.role() = 'service_role');

-- Create indexes for performance
CREATE INDEX idx_browser_sessions_parent_id ON public.browser_sessions(parent_id);
CREATE INDEX idx_browser_sessions_status ON public.browser_sessions(status);
CREATE INDEX idx_browser_sessions_session_id ON public.browser_sessions(session_id);
CREATE INDEX idx_tos_compliance_hostname ON public.tos_compliance_cache(hostname);
CREATE INDEX idx_tos_compliance_expires ON public.tos_compliance_cache(expires_at);
CREATE INDEX idx_partnerships_hostname ON public.camp_provider_partnerships(hostname);
CREATE INDEX idx_partnerships_status ON public.camp_provider_partnerships(status);

-- Create trigger for updating timestamps
CREATE TRIGGER update_browser_sessions_updated_at
  BEFORE UPDATE ON public.browser_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_partnerships_updated_at
  BEFORE UPDATE ON public.camp_provider_partnerships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some initial camp provider partnerships
INSERT INTO public.camp_provider_partnerships (hostname, organization_name, status, partnership_type, notes) VALUES
('active.com', 'Active Network', 'approved', 'official_api', 'Has public API for camp registrations'),
('campwise.com', 'CampWise', 'pending', 'approved_automation', 'Outreach in progress'),
('ymca.org', 'YMCA', 'approved', 'approved_automation', 'Approved for respectful automation'),
('campminder.com', 'CampMinder', 'pending', 'approved_automation', 'Partnership discussions ongoing'),
('daysmart.com', 'DaySmart Recreation', 'unknown', null, 'Not contacted yet'),
('jackrabbitclass.com', 'Jackrabbit Class', 'unknown', null, 'Not contacted yet');