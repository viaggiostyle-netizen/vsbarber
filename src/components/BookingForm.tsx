import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookingCalendar } from './BookingCalendar';
import { TimeSlots } from './TimeSlots';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useIsDateBlocked } from '@/hooks/useIsDateBlocked';
import { Umbrella } from 'lucide-react';

const bookingSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  telefono: z.string().min(8, 'Ingresa un teléfono válido').max(20),
  email: z.string().email('Ingresa un email válido').max(255),
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface BookingFormProps {
  serviceName: string;
  servicePrice: number;
  onSuccess: (reserva: {
    nombre: string;
    servicio: string;
    fecha: string;
    hora: string;
    precio: number;
  }) => void;
  onBack: () => void;
}

export function BookingForm({ serviceName, servicePrice, onSuccess, onBack }: BookingFormProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { data: isDateBlocked = false } = useIsDateBlocked(selectedDate);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
  });

  const onSubmit = async (data: BookingFormData) => {
    if (!selectedDate || !selectedTime) {
      toast.error('Por favor selecciona fecha y hora');
      return;
    }

    setIsSubmitting(true);
    try {
      // Use secure edge function to create reservation
      const { data: result, error } = await supabase.functions.invoke('create-reservation', {
        body: {
          nombre: data.nombre,
          telefono: data.telefono,
          email: data.email,
          servicio: serviceName,
          precio: servicePrice,
          fecha: format(selectedDate, 'yyyy-MM-dd'),
          hora: selectedTime,
        },
      });

      if (error) {
        console.error('Reservation error:', error);
        toast.error('Error al crear la reserva. Intenta nuevamente.');
        return;
      }

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      // Invalidate queries to refresh availability
      queryClient.invalidateQueries({ queryKey: ['reservas-availability'] });

      const fechaFormateada = format(selectedDate, "EEEE d 'de' MMMM, yyyy", { locale: es });
      onSuccess({
        nombre: data.nombre,
        servicio: serviceName,
        fecha: fechaFormateada,
        hora: selectedTime,
        precio: servicePrice,
      });
    } catch (error: any) {
      console.error('Booking error:', error);
      toast.error('Error al crear la reserva. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre</Label>
          <Input
            id="nombre"
            placeholder="Tu nombre completo"
            {...register('nombre')}
            className="bg-card"
          />
          {errors.nombre && (
            <p className="text-sm text-destructive">{errors.nombre.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="telefono">Teléfono</Label>
          <Input
            id="telefono"
            type="tel"
            placeholder="Tu número de teléfono"
            {...register('telefono')}
            className="bg-card"
          />
          {errors.telefono && (
            <p className="text-sm text-destructive">{errors.telefono.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Gmail</Label>
          <Input
            id="email"
            type="email"
            placeholder="tucorreo@gmail.com"
            {...register('email')}
            className="bg-card"
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <Label>Selecciona una fecha</Label>
        <BookingCalendar selected={selectedDate} onSelect={(date) => {
          setSelectedDate(date);
          setSelectedTime(null);
        }} />
      </div>

      {selectedDate && (
        <div className="space-y-4">
          {isDateBlocked ? (
            <div className="flex flex-col items-center gap-3 py-8 px-4 rounded-lg bg-destructive/10 border border-destructive/30">
              <Umbrella className="w-12 h-12 text-destructive" />
              <p className="text-center text-destructive font-medium">
                No disponible porque el barbero está de vacaciones
              </p>
              <p className="text-sm text-muted-foreground text-center">
                Por favor selecciona otra fecha
              </p>
            </div>
          ) : (
            <>
              <Label>Horarios disponibles para {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}</Label>
              <TimeSlots
                date={selectedDate}
                selected={selectedTime}
                onSelect={setSelectedTime}
              />
            </>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 pt-4">
        <Button
          type="submit"
          size="lg"
          disabled={!selectedDate || !selectedTime || isSubmitting || isDateBlocked}
          className="w-full"
        >
          {isSubmitting ? 'Agendando...' : 'Agendar reserva'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onBack}
          className="w-full"
        >
          Volver
        </Button>
      </div>
    </form>
  );
}