import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface BlockedHour {
  id: string;
  fecha: string;
  hora: string;
  motivo: string | null;
  created_at: string;
}

export function useBlockedHours(date: Date | undefined) {
  return useQuery({
    queryKey: ['blocked-hours', date ? format(date, 'yyyy-MM-dd') : null],
    queryFn: async () => {
      if (!date) return [];
      
      const { data, error } = await supabase
        .rpc('get_blocked_hours', { check_date: format(date, 'yyyy-MM-dd') });
      
      if (error) throw error;
      return (data || []).map((r: { hora: string }) => r.hora) as string[];
    },
    enabled: !!date,
  });
}

export function useBlockedHoursForDate(date: Date | undefined) {
  return useQuery({
    queryKey: ['blocked-hours-full', date ? format(date, 'yyyy-MM-dd') : null],
    queryFn: async () => {
      if (!date) return [];
      
      const { data, error } = await supabase
        .from('blocked_hours')
        .select('*')
        .eq('fecha', format(date, 'yyyy-MM-dd'));
      
      if (error) throw error;
      return data as BlockedHour[];
    },
    enabled: !!date,
  });
}

export function useBlockHour() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ fecha, hora, motivo }: { fecha: string; hora: string; motivo?: string }) => {
      const { error } = await supabase
        .from('blocked_hours')
        .insert({ fecha, hora, motivo });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-hours'] });
      queryClient.invalidateQueries({ queryKey: ['blocked-hours-full'] });
      queryClient.invalidateQueries({ queryKey: ['reservas-availability'] });
    },
  });
}

export function useUnblockHour() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ fecha, hora }: { fecha: string; hora: string }) => {
      const { error } = await supabase
        .from('blocked_hours')
        .delete()
        .eq('fecha', fecha)
        .eq('hora', hora);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-hours'] });
      queryClient.invalidateQueries({ queryKey: ['blocked-hours-full'] });
      queryClient.invalidateQueries({ queryKey: ['reservas-availability'] });
    },
  });
}
