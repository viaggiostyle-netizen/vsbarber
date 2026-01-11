-- Ensure blocked_hours is not publicly readable
DROP POLICY IF EXISTS "Anyone can view blocked hours" ON public.blocked_hours;
CREATE POLICY "Authenticated can view blocked hours"
ON public.blocked_hours
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Reinforce reservas RLS: SELECT only for admins
DROP POLICY IF EXISTS "Only admins can view full reservas data" ON public.reservas;
CREATE POLICY "Only admins can view full reservas data"
ON public.reservas
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Reinforce fcm_tokens RLS: only admins for all operations
DROP POLICY IF EXISTS "Only admins can view FCM tokens" ON public.fcm_tokens;
CREATE POLICY "Only admins can view FCM tokens"
ON public.fcm_tokens
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can register FCM token" ON public.fcm_tokens;
CREATE POLICY "Admins can register FCM token"
ON public.fcm_tokens
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update FCM token" ON public.fcm_tokens;
CREATE POLICY "Admins can update FCM token"
ON public.fcm_tokens
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Only admins can delete FCM tokens" ON public.fcm_tokens;
CREATE POLICY "Only admins can delete FCM tokens"
ON public.fcm_tokens
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));