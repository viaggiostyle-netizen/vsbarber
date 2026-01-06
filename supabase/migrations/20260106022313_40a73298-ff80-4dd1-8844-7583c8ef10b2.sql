-- 1. Eliminar la vista de disponibilidad (ya no la necesitamos, usamos la función RPC)
DROP VIEW IF EXISTS public.reservas_availability;

-- 2. Arreglar política de DELETE: solo admins pueden eliminar reservas
DROP POLICY IF EXISTS "Anyone can delete reservas" ON public.reservas;

CREATE POLICY "Only admins can delete reservas"
ON public.reservas
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Arreglar política de user_roles: solo admins pueden ver roles
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "Only admins can view roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));