-- 0. Create the update_updated_at_column function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 1. Create enum for appointment states
CREATE TYPE public.estado_cita AS ENUM ('pendiente', 'completada', 'ausente_con_aviso', 'no_show', 'cancelada');

-- 2. Add estado column to reservas table
ALTER TABLE public.reservas 
ADD COLUMN estado public.estado_cita NOT NULL DEFAULT 'pendiente';

-- 3. Create vacation_blocks table for date range blocking
CREATE TABLE public.vacation_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  motivo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT fecha_valida CHECK (fecha_fin >= fecha_inicio)
);

-- Enable RLS on vacation_blocks
ALTER TABLE public.vacation_blocks ENABLE ROW LEVEL SECURITY;

-- Policies for vacation_blocks (admin only)
CREATE POLICY "Admins can manage vacation_blocks"
ON public.vacation_blocks
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view vacation_blocks"
ON public.vacation_blocks
FOR SELECT
USING (true);

-- 4. Create clientes table to track client history and reputation
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  telefono TEXT NOT NULL,
  nombre TEXT NOT NULL,
  total_citas INTEGER NOT NULL DEFAULT 0,
  citas_completadas INTEGER NOT NULL DEFAULT 0,
  citas_ausente_aviso INTEGER NOT NULL DEFAULT 0,
  citas_no_show INTEGER NOT NULL DEFAULT 0,
  citas_canceladas INTEGER NOT NULL DEFAULT 0,
  bloqueado BOOLEAN NOT NULL DEFAULT false,
  motivo_bloqueo TEXT,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_cliente UNIQUE (email, telefono)
);

-- Enable RLS on clientes
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Policies for clientes (admin only)
CREATE POLICY "Admins can manage clientes"
ON public.clientes
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5. Add update trigger for clientes updated_at
CREATE TRIGGER update_clientes_updated_at
BEFORE UPDATE ON public.clientes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Create function to update client stats when reservation state changes
CREATE OR REPLACE FUNCTION public.update_cliente_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cliente_id UUID;
BEGIN
  -- Find or create the client
  INSERT INTO public.clientes (email, telefono, nombre)
  VALUES (lower(NEW.email), NEW.telefono, NEW.nombre)
  ON CONFLICT (email, telefono) 
  DO UPDATE SET 
    nombre = EXCLUDED.nombre,
    updated_at = now()
  RETURNING id INTO cliente_id;

  -- Update the total count
  UPDATE public.clientes 
  SET total_citas = (
    SELECT COUNT(*) FROM public.reservas 
    WHERE lower(email) = lower(NEW.email) AND telefono = NEW.telefono
  )
  WHERE id = cliente_id;

  -- If state changed, update specific counters
  IF TG_OP = 'UPDATE' AND OLD.estado IS DISTINCT FROM NEW.estado THEN
    -- Decrement old state counter
    IF OLD.estado = 'completada' THEN
      UPDATE public.clientes SET citas_completadas = GREATEST(0, citas_completadas - 1) WHERE id = cliente_id;
    ELSIF OLD.estado = 'ausente_con_aviso' THEN
      UPDATE public.clientes SET citas_ausente_aviso = GREATEST(0, citas_ausente_aviso - 1) WHERE id = cliente_id;
    ELSIF OLD.estado = 'no_show' THEN
      UPDATE public.clientes SET citas_no_show = GREATEST(0, citas_no_show - 1) WHERE id = cliente_id;
    ELSIF OLD.estado = 'cancelada' THEN
      UPDATE public.clientes SET citas_canceladas = GREATEST(0, citas_canceladas - 1) WHERE id = cliente_id;
    END IF;
  END IF;

  -- Increment new state counter (only if not pendiente)
  IF NEW.estado = 'completada' THEN
    UPDATE public.clientes SET citas_completadas = citas_completadas + 1 WHERE id = cliente_id;
  ELSIF NEW.estado = 'ausente_con_aviso' THEN
    UPDATE public.clientes SET citas_ausente_aviso = citas_ausente_aviso + 1 WHERE id = cliente_id;
  ELSIF NEW.estado = 'no_show' THEN
    UPDATE public.clientes SET citas_no_show = citas_no_show + 1 WHERE id = cliente_id;
  ELSIF NEW.estado = 'cancelada' THEN
    UPDATE public.clientes SET citas_canceladas = citas_canceladas + 1 WHERE id = cliente_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for updating client stats
CREATE TRIGGER on_reserva_state_change
AFTER INSERT OR UPDATE OF estado ON public.reservas
FOR EACH ROW
EXECUTE FUNCTION public.update_cliente_stats();

-- 7. Create function to check if a date is in vacation block
CREATE OR REPLACE FUNCTION public.is_date_blocked(check_date DATE)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vacation_blocks
    WHERE check_date BETWEEN fecha_inicio AND fecha_fin
  );
$$;