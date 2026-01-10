-- Allow admins to delete FCM tokens (needed for unsubscribe)
ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'fcm_tokens'
      AND policyname = 'Only admins can delete FCM tokens'
  ) THEN
    CREATE POLICY "Only admins can delete FCM tokens"
    ON public.fcm_tokens
    FOR DELETE
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;