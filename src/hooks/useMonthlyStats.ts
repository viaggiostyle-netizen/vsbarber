import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format, getWeek, startOfWeek, differenceInCalendarWeeks, parseISO, getDay } from 'date-fns';
import { es } from 'date-fns/locale';

export interface WeeklyStats {
  week: number;
  weekLabel: string;
  clients: number;
  revenue: number;
}

export interface MonthlyStats {
  month: string;
  monthLabel: string;
  weeklyData: WeeklyStats[];
  totalClients: number;
  totalRevenue: number;
}

// Get week number within the month (1-5)
function getWeekOfMonth(date: Date): number {
  const startOfMonthDate = startOfMonth(date);
  const startOfMonthWeek = startOfWeek(startOfMonthDate, { weekStartsOn: 1 }); // Monday start
  return differenceInCalendarWeeks(date, startOfMonthWeek, { weekStartsOn: 1 }) + 1;
}

// Get number of weeks in a month
function getWeeksInMonth(year: number, month: number): number {
  const start = startOfMonth(new Date(year, month));
  const end = endOfMonth(new Date(year, month));
  return differenceInCalendarWeeks(end, startOfWeek(start, { weekStartsOn: 1 }), { weekStartsOn: 1 }) + 1;
}

export function useMonthlyStats(year: number, month: number) {
  const monthDate = new Date(year, month);
  const monthStart = format(startOfMonth(monthDate), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(monthDate), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['monthly-stats', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .gte('fecha', monthStart)
        .lte('fecha', monthEnd)
        .eq('estado', 'completada') // Only count completed reservations
        .order('fecha', { ascending: true });

      if (error) throw error;

      const reservas = data || [];
      const weeksCount = getWeeksInMonth(year, month);
      
      // Initialize weekly data
      const weeklyData: WeeklyStats[] = Array.from({ length: weeksCount }, (_, i) => ({
        week: i + 1,
        weekLabel: `Semana ${i + 1}`,
        clients: 0,
        revenue: 0,
      }));

      // Aggregate data by week (only completed reservations)
      reservas.forEach((reserva) => {
        const reservaDate = parseISO(reserva.fecha);
        // Skip Sundays (barbershop closed)
        if (getDay(reservaDate) === 0) return;
        
        const weekOfMonth = getWeekOfMonth(reservaDate);
        const weekIndex = Math.min(weekOfMonth - 1, weeksCount - 1);
        
        if (weekIndex >= 0 && weekIndex < weeklyData.length) {
          weeklyData[weekIndex].clients += 1;
          weeklyData[weekIndex].revenue += reserva.precio;
        }
      });

      const totalClients = weeklyData.reduce((sum, w) => sum + w.clients, 0);
      const totalRevenue = weeklyData.reduce((sum, w) => sum + w.revenue, 0);

      return {
        month: format(monthDate, 'yyyy-MM'),
        monthLabel: format(monthDate, 'MMMM yyyy', { locale: es }),
        weeklyData,
        totalClients,
        totalRevenue,
      } as MonthlyStats;
    },
  });
}

// Get available months starting from January 2026
export function useAvailableMonths() {
  return useQuery({
    queryKey: ['available-months'],
    queryFn: async () => {
      const startDate = new Date(2026, 0, 1); // January 2026
      const currentDate = new Date();
      const months: { year: number; month: number; label: string }[] = [];

      let date = new Date(startDate);
      while (date <= currentDate) {
        months.push({
          year: date.getFullYear(),
          month: date.getMonth(),
          label: format(date, 'MMMM yyyy', { locale: es }),
        });
        date.setMonth(date.getMonth() + 1);
      }

      return months;
    },
  });
}
