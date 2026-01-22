import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type EstadoCita = Database['public']['Enums']['estado_cita'];

export interface Reserva {
  id: string;
  nombre: string;
  telefono: string;
  email: string;
  servicio: string;
  precio: number;
  fecha: string;
  hora: string;
  estado: EstadoCita;
  created_at: string;
}

export interface CreateReservaInput {
  nombre: string;
  telefono: string;
  email: string;
  servicio: string;
  precio: number;
  fecha: Date;
  hora: string;
}

export function useReservas() {
  return useQuery({
    queryKey: ['reservas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .order('fecha', { ascending: true })
        .order('hora', { ascending: true });
      
      if (error) throw error;
      return data as Reserva[];
    },
  });
}

export function useReservasByDate(date: Date | undefined) {
  return useQuery({
    queryKey: ['reservas-availability', date ? format(date, 'yyyy-MM-dd') : null],
    queryFn: async () => {
      if (!date) return [];
      
      // Use secure RPC function that only returns booked hours (no personal data)
      const { data, error } = await supabase
        .rpc('get_booked_hours', { check_date: format(date, 'yyyy-MM-dd') });
      
      if (error) throw error;
      return (data || []).map((r: { hora: string }) => r.hora) as string[];
    },
    enabled: !!date,
  });
}

export function useReservaByEmail(email: string | null) {
  return useQuery({
    queryKey: ['reserva-by-email', email],
    queryFn: async () => {
      if (!email) return null;
      
      // Use secure RPC function to get reservation by email
      const { data, error } = await supabase
        .rpc('get_reserva_by_email', { search_email: email.toLowerCase() });
      
      if (error) throw error;
      
      // RPC returns an array, get first result
      const result = Array.isArray(data) && data.length > 0 ? data[0] : null;
      return result as Reserva | null;
    },
    enabled: !!email,
  });
}

// Note: Reservations are now created via secure edge function (create-reservation)
// This hook is kept for admin functionality only

export function useDeleteReserva() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('reservas')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservas'] });
      queryClient.invalidateQueries({ queryKey: ['reserva-by-email'] });
    },
  });
}

export function useTodayStats() {
  const today = format(new Date(), 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['today-stats', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .eq('fecha', today);
      
      if (error) throw error;
      
      const reservas = data as Reserva[];
      // Only count completed reservations for revenue
      const completadas = reservas.filter(r => r.estado === 'completada');
      const totalIngresos = completadas.reduce((sum, r) => sum + r.precio, 0);
      
      return {
        count: reservas.length, // Total reservations for the day
        completedCount: completadas.length, // Only completed
        ingresos: totalIngresos, // Revenue only from completed
        reservas,
      };
    },
  });
}
