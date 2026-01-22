import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Cliente {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
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
        .order('citas_completadas', { ascending: false });

      if (error) throw error;
      return data as Cliente[];
    },
  });
}

export function useDeleteCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clienteId: string) => {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', clienteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    },
  });
}

export function useUpdateClienteNotas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clienteId, notas }: { clienteId: string; notas: string }) => {
      const { error } = await supabase
        .from('clientes')
        .update({ notas })
        .eq('id', clienteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    },
  });
}
