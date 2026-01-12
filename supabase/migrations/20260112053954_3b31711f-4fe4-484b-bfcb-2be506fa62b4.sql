-- Enable RLS and add policies for reservas and blocked_hours

-- reservas: public can INSERT (needed for booking), only admins can read/update/delete
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can create reservas" ON public.reservas;
DROP POLICY IF EXISTS "Admins can read reservas" ON public.reservas;
DROP POLICY IF EXISTS "Admins can update reservas" ON public.reservas;
DROP POLICY IF EXISTS "Admins can delete reservas" ON public.reservas;

CREATE POLICY "Public can create reservas"
ON public.reservas
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can read reservas"
ON public.reservas
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reservas"
ON public.reservas
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete reservas"
ON public.reservas
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));


-- blocked_hours: admins only
ALTER TABLE public.blocked_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage blocked_hours" ON public.blocked_hours;

CREATE POLICY "Admins manage blocked_hours"
ON public.blocked_hours
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
