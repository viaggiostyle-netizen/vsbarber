-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_hours ENABLE ROW LEVEL SECURITY;

-- Allow the primary owner email to read reservas in addition to admins.
-- This helps resolve "exposed data" warnings while keeping reservas private.
DROP POLICY IF EXISTS "Owner email can read reservas" ON public.reservas;
CREATE POLICY "Owner email can read reservas"
ON public.reservas
FOR SELECT
TO authenticated
USING (
  lower(auth.jwt() ->> 'email') = 'camiloviaggio01@gmail.com'
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Allow the primary owner email to manage blocked_hours in addition to admins.
DROP POLICY IF EXISTS "Owner email can manage blocked_hours" ON public.blocked_hours;
CREATE POLICY "Owner email can manage blocked_hours"
ON public.blocked_hours
FOR ALL
TO authenticated
USING (
  lower(auth.jwt() ->> 'email') = 'camiloviaggio01@gmail.com'
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  lower(auth.jwt() ->> 'email') = 'camiloviaggio01@gmail.com'
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);
