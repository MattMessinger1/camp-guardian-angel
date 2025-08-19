-- Restrict legacy tables to admin-only access and remove bypassing functions
-- This ensures only the canonical create-reservation -> fairness queue path is used

-- 1. Restrict old registrations table to admin-only
DROP POLICY IF EXISTS "delete_own_registrations" ON public.registrations;
DROP POLICY IF EXISTS "insert_own_registrations" ON public.registrations;
DROP POLICY IF EXISTS "select_own_registrations" ON public.registrations;
DROP POLICY IF EXISTS "update_own_registrations" ON public.registrations;

-- Admin-only access to legacy registrations table
CREATE POLICY "admin_only_registrations_select" ON public.registrations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@admin.%'
    )
  );

CREATE POLICY "admin_only_registrations_all" ON public.registrations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@admin.%'
    )
  );

-- 2. Disable legacy register-session function by creating a stub that returns 410 Gone
DROP FUNCTION IF EXISTS public.register_session_legacy CASCADE;
CREATE FUNCTION public.register_session_legacy(registration_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log the attempt
  INSERT INTO public.compliance_audit (
    user_id, event_type, event_data, payload_summary
  ) VALUES (
    auth.uid(),
    'LEGACY_ENDPOINT_BLOCKED',
    jsonb_build_object(
      'function', 'register_session_legacy',
      'registration_id', registration_id,
      'ip_address', inet_client_addr(),
      'timestamp', now()
    ),
    'Legacy registration endpoint blocked'
  );
  
  -- Return 410 Gone equivalent
  RAISE EXCEPTION 'Legacy registration endpoint has been removed. Use create-reservation instead.' 
    USING ERRCODE = 'function_obsolete';
END;
$$;

-- 3. Block direct writes to old registration_attempts table except from canonical path
DROP POLICY IF EXISTS "select_own_attempts" ON public.registration_attempts;

CREATE POLICY "admin_only_registration_attempts" ON public.registration_attempts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@admin.%'
    )
  );

-- 4. Create audit trigger for any attempts to use legacy paths
CREATE OR REPLACE FUNCTION audit_legacy_access()
RETURNS trigger AS $$
BEGIN
  -- Log any attempt to access legacy tables directly
  INSERT INTO public.compliance_audit (
    user_id, event_type, event_data, payload_summary
  ) VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    'LEGACY_TABLE_ACCESS',
    jsonb_build_object(
      'table_name', TG_TABLE_NAME,
      'operation', TG_OP,
      'ip_address', inet_client_addr(),
      'timestamp', now()
    ),
    format('Legacy table %s accessed via %s', TG_TABLE_NAME, TG_OP)
  );
  
  -- Allow the operation to proceed for audit purposes
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add audit triggers to legacy tables
DROP TRIGGER IF EXISTS audit_legacy_registrations ON public.registrations;
CREATE TRIGGER audit_legacy_registrations
  AFTER INSERT OR UPDATE OR DELETE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION audit_legacy_access();

DROP TRIGGER IF EXISTS audit_legacy_registration_attempts ON public.registration_attempts;
CREATE TRIGGER audit_legacy_registration_attempts
  AFTER INSERT OR UPDATE OR DELETE ON public.registration_attempts
  FOR EACH ROW EXECUTE FUNCTION audit_legacy_access();