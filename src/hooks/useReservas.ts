import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface Reserva {
  id: string;
  nombre: string;
  telefono: string;
  email: string;
  servicio: string;
  precio: number;
  fecha: string;
  hora: string;
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
      
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .eq('email', email.toLowerCase())
        .gte('fecha', today)
        .order('fecha', { ascending: true })
        .maybeSingle();
      
      if (error) throw error;
      return data as Reserva | null;
    },
    enabled: !!email,
  });
}

export function useCreateReserva() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateReservaInput) => {
      const { data, error } = await supabase
        .from('reservas')
        .insert({
          nombre: input.nombre,
          telefono: input.telefono,
          email: input.email.toLowerCase(),
          servicio: input.servicio,
          precio: input.precio,
          fecha: format(input.fecha, 'yyyy-MM-dd'),
          hora: input.hora,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Reserva;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservas'] });
    },
  });
}

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
      const totalIngresos = reservas.reduce((sum, r) => sum + r.precio, 0);
      
      return {
        count: reservas.length,
        ingresos: totalIngresos,
        reservas,
      };
    },
  });
}
