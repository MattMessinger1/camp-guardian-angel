-- Create plan_children_map table for multi-child registration support
CREATE TABLE IF NOT EXISTS public.plan_children_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.registration_plans(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  session_ids TEXT[] NOT NULL DEFAULT '{}', -- array of session IDs
  priority INTEGER DEFAULT 0, -- lower = higher priority
  conflict_resolution TEXT CHECK (conflict_resolution IN ('skip','next_available','waitlist')) DEFAULT 'next_available',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure unique plan_id + child_id combination
  UNIQUE(plan_id, child_id)
);

-- Enable RLS on plan_children_map
ALTER TABLE public.plan_children_map ENABLE ROW LEVEL SECURITY;

-- RLS policies for plan_children_map
CREATE POLICY "Users can manage their own plan children mappings" 
ON public.plan_children_map 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.registration_plans rp 
    WHERE rp.id = plan_children_map.plan_id 
    AND rp.user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_plan_children_map_updated_at
BEFORE UPDATE ON public.plan_children_map
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better query performance
CREATE INDEX idx_plan_children_map_plan_id ON public.plan_children_map(plan_id);
CREATE INDEX idx_plan_children_map_child_id ON public.plan_children_map(child_id);
CREATE INDEX idx_plan_children_map_priority ON public.plan_children_map(plan_id, priority);