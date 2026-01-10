-- Remove remaining permissive fcm_tokens policies (no-trailing-space names)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='fcm_tokens' AND policyname='Anyone can register FCM token'
  ) THEN
    DROP POLICY "Anyone can register FCM token" ON public.fcm_tokens;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='fcm_tokens' AND policyname='Anyone can update their FCM token'
  ) THEN
    DROP POLICY "Anyone can update their FCM token" ON public.fcm_tokens;
  END IF;
END $$;