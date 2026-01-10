-- Create table for blocked hours
CREATE TABLE public.blocked_hours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha DATE NOT NULL,
  hora TIME WITHOUT TIME ZONE NOT NULL,
  motivo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(fecha, hora)
);

-- Enable RLS
ALTER TABLE public.blocked_hours ENABLE ROW LEVEL SECURITY;

-- Only admins can view blocked hours
CREATE POLICY "Anyone can view blocked hours"
ON public.blocked_hours
FOR SELECT
USING (true);

-- Only admins can insert blocked hours
CREATE POLICY "Admins can insert blocked hours"
ON public.blocked_hours
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete blocked hours
CREATE POLICY "Admins can delete blocked hours"
ON public.blocked_hours
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to get blocked hours for a specific date
CREATE OR REPLACE FUNCTION public.get_blocked_hours(check_date date)
RETURNS TABLE(hora time without time zone)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT hora FROM public.blocked_hours WHERE fecha = check_date;
$$;