-- Eliminar las políticas actuales de SELECT
DROP POLICY IF EXISTS "Public availability check" ON public.reservas;
DROP POLICY IF EXISTS "Admins can view all reservas" ON public.reservas;

-- Solo admins pueden ver TODOS los datos de la tabla reservas
CREATE POLICY "Only admins can view full reservas data"
ON public.reservas
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Los usuarios anónimos solo pueden ver la vista de disponibilidad
-- La vista ya está creada con security_invoker = true
-- Pero necesitamos una política que permita el SELECT limitado para la vista

-- Crear una función RPC segura para verificar disponibilidad sin exponer datos
CREATE OR REPLACE FUNCTION public.get_booked_hours(check_date date)
RETURNS TABLE(hora time without time zone)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT hora FROM public.reservas WHERE fecha = check_date;
$$;