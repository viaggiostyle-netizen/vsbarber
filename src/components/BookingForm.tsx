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
import { useCreateReserva } from '@/hooks/useReservas';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const createReserva = useCreateReserva();

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

    try {
      await createReserva.mutateAsync({
        nombre: data.nombre,
        telefono: data.telefono,
        email: data.email,
        servicio: serviceName,
        precio: servicePrice,
        fecha: selectedDate,
        hora: selectedTime,
      });

      // Send email notification (non-blocking)
      const fechaFormateada = format(selectedDate, "EEEE d 'de' MMMM, yyyy", { locale: es });
      supabase.functions.invoke('send-booking-notification', {
        body: {
          nombre: data.nombre,
          email: data.email,
          telefono: data.telefono,
          servicio: serviceName,
          fecha: fechaFormateada,
          hora: selectedTime,
          precio: servicePrice,
        },
      }).then(({ error }) => {
        if (error) {
          console.error('Error sending notification:', error);
        }
      });

      onSuccess({
        nombre: data.nombre,
        servicio: serviceName,
        fecha: fechaFormateada,
        hora: selectedTime,
        precio: servicePrice,
      });
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Este horario ya fue reservado. Por favor elige otro.');
      } else {
        toast.error('Error al crear la reserva. Intenta nuevamente.');
      }
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
          <Label>Horarios disponibles para {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}</Label>
          <TimeSlots
            date={selectedDate}
            selected={selectedTime}
            onSelect={setSelectedTime}
          />
        </div>
      )}

      <div className="flex flex-col gap-3 pt-4">
        <Button
          type="submit"
          size="lg"
          disabled={!selectedDate || !selectedTime || createReserva.isPending}
          className="w-full"
        >
          {createReserva.isPending ? 'Agendando...' : 'Agendar reserva'}
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
