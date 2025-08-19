-- Add a test HIPAA avoidance entry for "Active" platform to demonstrate the feature
INSERT INTO public.hipaa_avoidance_log (
  provider_domain,
  risk_level,
  risky_fields,
  safe_alternatives,
  detection_accuracy,
  false_positive_rate,
  learning_iteration,
  sessions_avoided,
  compliance_cost_saved,
  created_at
) VALUES (
  'Active',
  'high',
  ARRAY['medical_info', 'medical_conditions', 'allergies'],
  '{"child_fields": ["name", "dob"], "documents": ["waiver"], "alternative_approach": "Collect medical info directly with provider after registration"}'::jsonb,
  0.95,
  0.05,
  1,
  1,
  10000,
  now()
);