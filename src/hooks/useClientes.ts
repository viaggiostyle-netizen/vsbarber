import { useQuery } from '@tanstack/react-query';
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
