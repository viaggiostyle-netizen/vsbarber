import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export function useIsDateBlocked(date: Date | undefined) {
  return useQuery({
    queryKey: ['is-date-blocked', date ? format(date, 'yyyy-MM-dd') : null],
    queryFn: async () => {
      if (!date) return false;
      
      const { data, error } = await supabase
        .rpc('is_date_blocked', { check_date: format(date, 'yyyy-MM-dd') });
      
      if (error) throw error;
      return data as boolean;
    },
    enabled: !!date,
  });
}

export function useVacationBlocksForCalendar() {
  return useQuery({
    queryKey: ['vacation-blocks-calendar'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vacation_blocks')
        .select('fecha_inicio, fecha_fin')
        .gte('fecha_fin', format(new Date(), 'yyyy-MM-dd'));
      
      if (error) throw error;
      return data || [];
    },
  });
}
