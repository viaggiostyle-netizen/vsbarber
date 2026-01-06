-- Recrear la vista con SECURITY INVOKER para que use los permisos del usuario que consulta
DROP VIEW IF EXISTS public.reservas_availability;

CREATE VIEW public.reservas_availability 
WITH (security_invoker = true) AS
SELECT fecha, hora, servicio
FROM public.reservas;

-- Dar acceso público a la vista
GRANT SELECT ON public.reservas_availability TO anon, authenticated;

-- Política para permitir SELECT en la tabla base a través de la vista
-- Esto permite que la vista funcione para usuarios anónimos
DROP POLICY IF EXISTS "Public availability check" ON public.reservas;
CREATE POLICY "Public availability check"
ON public.reservas
FOR SELECT
USING (true);