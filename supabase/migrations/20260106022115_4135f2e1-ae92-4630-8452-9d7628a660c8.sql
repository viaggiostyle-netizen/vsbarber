-- Eliminar la política actual de SELECT
DROP POLICY IF EXISTS "Anyone can view reservas for availability" ON public.reservas;

-- Crear una política más segura: solo admins pueden ver todos los datos
CREATE POLICY "Admins can view all reservas"
ON public.reservas
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Crear una vista pública para verificar disponibilidad (solo fecha, hora, servicio)
-- Esta vista NO expone datos personales
CREATE OR REPLACE VIEW public.reservas_availability AS
SELECT fecha, hora, servicio
FROM public.reservas;

-- Dar acceso público a la vista
GRANT SELECT ON public.reservas_availability TO anon, authenticated;