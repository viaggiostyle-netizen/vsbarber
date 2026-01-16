import { useState } from 'react';
import { format, isBefore, isToday, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBlockHour, useUnblockHour, useBlockedHoursForDate } from '@/hooks/useBlockedHours';
import { useReservasByDate } from '@/hooks/useReservas';
import { generateTimeSlots, getMinDate } from '@/lib/constants';
import { toast } from 'sonner';
import { Lock, Unlock, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VacationBlockManager } from './VacationBlockManager';

export function HourBlockManager() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { data: blockedHours = [], isLoading: loadingBlocked } = useBlockedHoursForDate(selectedDate);
  const { data: bookedHours = [], isLoading: loadingBooked } = useReservasByDate(selectedDate);
  const blockHour = useBlockHour();
  const unblockHour = useUnblockHour();

  const allSlots = generateTimeSlots(selectedDate);
  const blockedHourStrings = blockedHours.map(bh => bh.hora.substring(0, 5));

  const isHourPast = (hour: string) => {
    if (!isToday(selectedDate)) return false;
    const now = new Date();
    const [h, m] = hour.split(':').map(Number);
    const slotTime = new Date(selectedDate);
    slotTime.setHours(h, m, 0, 0);
    return isBefore(slotTime, now);
  };

  const handleToggleBlock = async (hour: string) => {
    const fecha = format(selectedDate, 'yyyy-MM-dd');
    const isBlocked = blockedHourStrings.includes(hour);
    
    try {
      if (isBlocked) {
        await unblockHour.mutateAsync({ fecha, hora: hour });
        toast.success(`Hora ${hour} desbloqueada`);
      } else {
        await blockHour.mutateAsync({ fecha, hora: hour, motivo: 'Bloqueado manualmente' });
        toast.success(`Hora ${hour} bloqueada`);
      }
    } catch (error) {
      toast.error('Error al modificar el bloqueo');
    }
  };

  const handleBlockPastHours = async () => {
    const fecha = format(selectedDate, 'yyyy-MM-dd');
    const pastHours = allSlots.filter(isHourPast).filter(h => !blockedHourStrings.includes(h));
    
    if (pastHours.length === 0) {
      toast.info('No hay horas pasadas para bloquear');
      return;
    }

    try {
      for (const hora of pastHours) {
        await blockHour.mutateAsync({ fecha, hora, motivo: 'Hora pasada' });
      }
      toast.success(`${pastHours.length} horas pasadas bloqueadas`);
    } catch (error) {
      toast.error('Error al bloquear horas pasadas');
    }
  };

  const isLoading = loadingBlocked || loadingBooked;

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5" />
          Gestión de Horarios
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Calendar */}
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              disabled={(date) => isBefore(date, getMinDate())}
              locale={es}
              className="rounded-md border pointer-events-auto"
            />
          </div>

          {/* Time slots */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
              </p>
              {isToday(selectedDate) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBlockPastHours}
                  disabled={blockHour.isPending}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Bloquear horas pasadas
                </Button>
              )}
            </div>

            {isLoading ? (
              <p className="text-muted-foreground text-center py-4">Cargando...</p>
            ) : allSlots.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No hay horarios configurados para este día
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {allSlots.map((slot) => {
                  const isBlocked = blockedHourStrings.includes(slot);
                  const isBooked = bookedHours.some(b => b.substring(0, 5) === slot);
                  const isPast = isHourPast(slot);
                  const isPending = blockHour.isPending || unblockHour.isPending;

                  return (
                    <button
                      key={slot}
                      onClick={() => !isBooked && handleToggleBlock(slot)}
                      disabled={isBooked || isPending}
                      className={cn(
                        'py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 relative',
                        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                        isBooked && 'bg-primary/20 text-primary cursor-not-allowed',
                        isBlocked && !isBooked && 'bg-destructive/20 text-destructive border-2 border-destructive/50',
                        isPast && !isBlocked && !isBooked && 'bg-muted text-muted-foreground opacity-60',
                        !isBlocked && !isBooked && !isPast && 'bg-card border border-border hover:border-foreground/50'
                      )}
                      title={
                        isBooked ? 'Reservado' : 
                        isBlocked ? 'Click para desbloquear' : 
                        'Click para bloquear'
                      }
                    >
                      <span className="flex items-center justify-center gap-1">
                        {slot}
                        {isBlocked && !isBooked && <Lock className="w-3 h-3" />}
                        {isBooked && <span className="text-xs">📅</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2 border-t">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-card border border-border"></span>
                Disponible
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-destructive/20 border-2 border-destructive/50"></span>
                Bloqueado
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-primary/20"></span>
                Reservado
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Vacation Block Manager */}
    <VacationBlockManager />
    </>
  );
}
