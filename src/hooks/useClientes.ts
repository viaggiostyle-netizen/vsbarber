import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Cliente {
  id: string;
  email: string;
  telefono: string;
  nombre: string;
  total_citas: number;
  citas_completadas: number;
  citas_ausente_aviso: number;
  citas_no_show: number;
  citas_canceladas: number;
  bloqueado: boolean;
  motivo_bloqueo: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export function useClientes() {
  return useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nombre', { ascending: true });
      
      if (error) throw error;
      return data as Cliente[];
    },
  });
}

export function useCliente(id: string | null) {
  return useQuery({
    queryKey: ['cliente', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data as Cliente | null;
    },
    enabled: !!id,
  });
}

export function useClienteReservas(email: string | null, telefono: string | null) {
  return useQuery({
    queryKey: ['cliente-reservas', email, telefono],
    queryFn: async () => {
      if (!email || !telefono) return [];
      
      const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .ilike('email', email)
        .eq('telefono', telefono)
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!email && !!telefono,
  });
}

export function useUpdateCliente() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Cliente> & { id: string }) => {
      const { error } = await supabase
        .from('clientes')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['cliente'] });
    },
  });
}

export function useToggleBloqueoCliente() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, bloqueado, motivo_bloqueo }: { id: string; bloqueado: boolean; motivo_bloqueo?: string }) => {
      const { error } = await supabase
        .from('clientes')
        .update({ bloqueado, motivo_bloqueo: bloqueado ? motivo_bloqueo : null })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['cliente'] });
    },
  });
}
