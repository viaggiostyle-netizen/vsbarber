-- Crear función RPC segura para buscar reserva por email
-- Esta función permite a cualquiera buscar SU PROPIA reserva usando su email
CREATE OR REPLACE FUNCTION public.get_reserva_by_email(search_email text)
RETURNS TABLE(
  id uuid,
  nombre text,
  telefono text,
  email text,
  servicio text,
  precio integer,
  fecha date,
  hora time without time zone,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, nombre, telefono, email, servicio, precio, fecha, hora, created_at
  FROM public.reservas
  WHERE reservas.email = lower(search_email)
    AND reservas.fecha >= CURRENT_DATE
  ORDER BY fecha ASC
  LIMIT 1;
$$;