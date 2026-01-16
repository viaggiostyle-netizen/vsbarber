import { useMemo } from 'react';
import { format, parseISO, isBefore, isToday, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Bell, Clock } from 'lucide-react';
import { Reserva } from '@/hooks/useReservas';

interface PendingStatusAlertProps {
  reservas: Reserva[];
}

export function PendingStatusAlert({ reservas }: PendingStatusAlertProps) {
  const pendingPastAppointments = useMemo(() => {
    const now = new Date();
    
    return reservas.filter((reserva) => {
      // Only check pending reservations
      if ((reserva as any).estado !== 'pendiente') return false;
      
      const reservaDate = parseISO(reserva.fecha);
      const [hours, minutes] = reserva.hora.split(':').map(Number);
      reservaDate.setHours(hours, minutes, 0, 0);
      
      // Check if appointment time has passed
      return isBefore(reservaDate, now);
    });
  }, [reservas]);

  if (pendingPastAppointments.length === 0) return null;

  return (
    <Alert variant="destructive" className="mb-4 border-yellow-500/50 bg-yellow-500/10">
      <Bell className="h-4 w-4 text-yellow-400" />
      <AlertTitle className="text-yellow-400">Citas pendientes de marcar</AlertTitle>
      <AlertDescription className="text-muted-foreground">
        Tienes <strong className="text-foreground">{pendingPastAppointments.length}</strong> cita(s) pasadas sin estado asignado. 
        Por favor, marca si el cliente asistió o no.
        <div className="mt-2 space-y-1">
          {pendingPastAppointments.slice(0, 3).map((reserva) => (
            <div key={reserva.id} className="flex items-center gap-2 text-sm">
              <Clock className="w-3 h-3" />
              <span className="font-medium">{reserva.nombre}</span>
              <span className="text-muted-foreground">
                - {format(parseISO(reserva.fecha), "EEE d MMM", { locale: es })} {reserva.hora.substring(0, 5)}
              </span>
            </div>
          ))}
          {pendingPastAppointments.length > 3 && (
            <p className="text-sm text-muted-foreground">
              y {pendingPastAppointments.length - 3} más...
            </p>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
