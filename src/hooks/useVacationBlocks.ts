import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface VacationBlock {
  id: string;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string | null;
  created_at: string;
  created_by: string | null;
}

export function useVacationBlocks() {
  return useQuery({
    queryKey: ['vacation-blocks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vacation_blocks')
        .select('*')
        .order('fecha_inicio', { ascending: true });

      if (error) throw error;
      return data as VacationBlock[];
    },
  });
}

export function useCreateVacationBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      fecha_inicio, 
      fecha_fin, 
      motivo 
    }: { 
      fecha_inicio: string; 
      fecha_fin: string; 
      motivo?: string 
    }) => {
      const { error } = await supabase
        .from('vacation_blocks')
        .insert({ fecha_inicio, fecha_fin, motivo });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacation-blocks'] });
      queryClient.invalidateQueries({ queryKey: ['reservas-availability'] });
    },
  });
}

export function useDeleteVacationBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (blockId: string) => {
      const { error } = await supabase
        .from('vacation_blocks')
        .delete()
        .eq('id', blockId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacation-blocks'] });
      queryClient.invalidateQueries({ queryKey: ['reservas-availability'] });
    },
  });
}
