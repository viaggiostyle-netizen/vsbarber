-- Tighten fcm_tokens RLS: admin-only write operations
DO $$
BEGIN
  -- Drop permissive policies if they exist
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='fcm_tokens' AND policyname='Anyone can register FCM token '
  ) THEN
    DROP POLICY "Anyone can register FCM token " ON public.fcm_tokens;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='fcm_tokens' AND policyname='Anyone can update their FCM token '
  ) THEN
    DROP POLICY "Anyone can update their FCM token " ON public.fcm_tokens;
  END IF;

  -- Create admin-only policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='fcm_tokens' AND policyname='Admins can register FCM token'
  ) THEN
    CREATE POLICY "Admins can register FCM token"
    ON public.fcm_tokens
    FOR INSERT
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='fcm_tokens' AND policyname='Admins can update FCM token'
  ) THEN
    CREATE POLICY "Admins can update FCM token"
    ON public.fcm_tokens
    FOR UPDATE
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;