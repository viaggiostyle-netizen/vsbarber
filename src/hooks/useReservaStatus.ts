import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type EstadoCita = 'pendiente' | 'completada' | 'ausente_con_aviso' | 'no_show' | 'cancelada';

export function useUpdateReservaStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: EstadoCita }) => {
      // If canceling, also delete the reservation to free the slot
      if (estado === 'cancelada') {
        const { error } = await supabase
          .from('reservas')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('reservas')
          .update({ estado })
          .eq('id', id);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservas'] });
      queryClient.invalidateQueries({ queryKey: ['reservas-availability'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['today-stats'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-stats'] });
    },
  });
}

export const ESTADO_LABELS: Record<EstadoCita, string> = {
  pendiente: 'Pendiente',
  completada: 'Completada',
  ausente_con_aviso: 'Ausente con aviso',
  no_show: 'No vino',
  cancelada: 'Cancelada',
};

export const ESTADO_COLORS: Record<EstadoCita, string> = {
  pendiente: 'bg-muted text-muted-foreground',
  completada: 'bg-green-500/20 text-green-400',
  ausente_con_aviso: 'bg-yellow-500/20 text-yellow-400',
  no_show: 'bg-destructive/20 text-destructive',
  cancelada: 'bg-destructive/20 text-destructive',
};
