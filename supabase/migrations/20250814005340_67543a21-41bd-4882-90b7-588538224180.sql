-- Create plan_items table for multi-session planning
CREATE TABLE public.plan_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL,
  session_id UUID NOT NULL,
  child_id UUID NOT NULL,
  priority INTEGER DEFAULT 0,
  is_backup BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Unique constraint to prevent duplicate plan_id + session_id + child_id combinations
  UNIQUE(plan_id, session_id, child_id)
);

-- Enable RLS
ALTER TABLE public.plan_items ENABLE ROW LEVEL SECURITY;

-- Create policies for plan_items
CREATE POLICY "Users can manage their own plan items"
ON public.plan_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.registration_plans rp 
    WHERE rp.id = plan_items.plan_id 
    AND rp.user_id = auth.uid()
  )
);

-- Add updated_at trigger
CREATE TRIGGER update_plan_items_updated_at
  BEFORE UPDATE ON public.plan_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add foreign key constraints
ALTER TABLE public.plan_items 
ADD CONSTRAINT fk_plan_items_plan_id 
FOREIGN KEY (plan_id) REFERENCES public.registration_plans(id) ON DELETE CASCADE;

ALTER TABLE public.plan_items 
ADD CONSTRAINT fk_plan_items_session_id 
FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;

ALTER TABLE public.plan_items 
ADD CONSTRAINT fk_plan_items_child_id 
FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE;