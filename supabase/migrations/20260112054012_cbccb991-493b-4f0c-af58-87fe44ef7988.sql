-- Tighten the public INSERT policy to avoid overly permissive "WITH CHECK (true)"

DROP POLICY IF EXISTS "Public can create reservas" ON public.reservas;

CREATE POLICY "Public can create reservas"
ON public.reservas
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL AND length(trim(email)) > 3
  AND nombre IS NOT NULL AND length(trim(nombre)) > 0
  AND telefono IS NOT NULL AND length(trim(telefono)) > 0
  AND servicio IS NOT NULL AND length(trim(servicio)) > 0
  AND precio IS NOT NULL AND precio > 0
  AND fecha IS NOT NULL
  AND hora IS NOT NULL
);
