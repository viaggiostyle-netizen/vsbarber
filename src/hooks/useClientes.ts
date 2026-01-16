import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  email: string;
  bloqueado: boolean;
  motivo_bloqueo: string | null;
  notas: string | null;
  total_citas: number;
  citas_completadas: number;
  citas_ausente_aviso: number;
  citas_no_show: number;
  citas_canceladas: number;
  created_at: string;
  updated_at: string;
}

export interface ClienteReserva {
  id: string;
  fecha: string;
  hora: string;
  servicio: string;
  precio: number;
  estado: string;
  created_at: string;
}

export function useClientes() {
  return useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data as Cliente[];
    },
  });
}

export function useClienteReservas(email: string | null, telefono: string | null) {
  return useQuery({
    queryKey: ['cliente-reservas', email, telefono],
    queryFn: async () => {
      if (!email || !telefono) return [];
      
      const { data, error } = await supabase
        .from('reservas')
        .select('id, fecha, hora, servicio, precio, estado, created_at')
        .eq('email', email.toLowerCase())
        .eq('telefono', telefono)
        .order('fecha', { ascending: false });
      
      if (error) throw error;
      return data as ClienteReserva[];
    },
    enabled: !!email && !!telefono,
  });
}

export function useUpdateCliente() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      nombre, 
      telefono, 
      email, 
      bloqueado, 
      motivo_bloqueo,
      notas 
    }: { 
      id: string; 
      nombre?: string;
      telefono?: string;
      email?: string;
      bloqueado?: boolean;
      motivo_bloqueo?: string | null;
      notas?: string | null;
    }) => {
      const updates: Record<string, unknown> = {};
      if (nombre !== undefined) updates.nombre = nombre;
      if (telefono !== undefined) updates.telefono = telefono;
      if (email !== undefined) updates.email = email.toLowerCase();
      if (bloqueado !== undefined) updates.bloqueado = bloqueado;
      if (motivo_bloqueo !== undefined) updates.motivo_bloqueo = motivo_bloqueo;
      if (notas !== undefined) updates.notas = notas;

      const { error } = await supabase
        .from('clientes')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    },
  });
}
