import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

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
    mutationFn: async ({ fecha_inicio, fecha_fin, motivo }: { fecha_inicio: Date; fecha_fin: Date; motivo?: string }) => {
      const { error } = await supabase
        .from('vacation_blocks')
        .insert({
          fecha_inicio: format(fecha_inicio, 'yyyy-MM-dd'),
          fecha_fin: format(fecha_fin, 'yyyy-MM-dd'),
          motivo,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacation-blocks'] });
      queryClient.invalidateQueries({ queryKey: ['blocked-hours'] });
      queryClient.invalidateQueries({ queryKey: ['reservas-availability'] });
    },
  });
}

export function useDeleteVacationBlock() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vacation_blocks')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacation-blocks'] });
      queryClient.invalidateQueries({ queryKey: ['blocked-hours'] });
      queryClient.invalidateQueries({ queryKey: ['reservas-availability'] });
    },
  });
}

export function useIsDateInVacation(date: Date | undefined) {
  return useQuery({
    queryKey: ['is-date-in-vacation', date ? format(date, 'yyyy-MM-dd') : null],
    queryFn: async () => {
      if (!date) return false;
      
      const dateStr = format(date, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('vacation_blocks')
        .select('id')
        .lte('fecha_inicio', dateStr)
        .gte('fecha_fin', dateStr)
        .limit(1);
      
      if (error) throw error;
      return (data?.length ?? 0) > 0;
    },
    enabled: !!date,
  });
}
