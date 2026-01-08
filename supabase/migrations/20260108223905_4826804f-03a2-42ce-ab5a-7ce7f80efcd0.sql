-- Create table for FCM tokens
CREATE TABLE public.fcm_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Allow public insert for anonymous token registration
CREATE POLICY "Anyone can register FCM token"
ON public.fcm_tokens
FOR INSERT
WITH CHECK (true);

-- Allow public update for token refresh
CREATE POLICY "Anyone can update their FCM token"
ON public.fcm_tokens
FOR UPDATE
USING (true);

-- Only admins can view tokens (for sending notifications)
CREATE POLICY "Only admins can view FCM tokens"
ON public.fcm_tokens
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));