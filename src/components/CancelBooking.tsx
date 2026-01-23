import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useReservaByEmail } from '@/hooks/useReservas';
import { formatPrice } from '@/lib/constants';
import { toast } from 'sonner';
import { ArrowLeft, Search, Trash2, Edit, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { BookingCalendar } from './BookingCalendar';
import { TimeSlots } from './TimeSlots';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const emailSchema = z.object({
  email: z.string().email('Ingresa un email válido'),
});

interface CancelBookingProps {
  onBack: () => void;
}

export function CancelBooking({ onBack }: CancelBookingProps) {
  const [searchEmail, setSearchEmail] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [modified, setModified] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isModifying, setIsModifying] = useState(false);
  const [showModifyForm, setShowModifyForm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  const { data: reserva, isLoading } = useReservaByEmail(searchEmail);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ email: string }>({
    resolver: zodResolver(emailSchema),
  });

  const onSearch = (data: { email: string }) => {
    setCancelled(false);
    setModified(false);
    setShowModifyForm(false);
    setSearchEmail(data.email.toLowerCase());
  };

  const handleCancel = async () => {
    if (!reserva) return;

    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-cancellation-notification', {
        body: {
          reserva_id: reserva.id,
          email: reserva.email,
        },
      });

      if (error) {
        console.error('Cancellation error:', error);
        toast.error('Error al cancelar la cita. Intenta nuevamente.');
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['reservas'] });
      queryClient.invalidateQueries({ queryKey: ['reserva-by-email'] });
      queryClient.invalidateQueries({ queryKey: ['booked-hours'] });
      
      setCancelled(true);
      setShowCancelConfirm(false);
      toast.success('Tu cita ha sido cancelada correctamente');
    } catch (error) {
      console.error('Cancel booking error:', error);
      toast.error('Error al cancelar la cita. Intenta nuevamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleModify = async () => {
    if (!reserva || !selectedDate || !selectedTime) {
      toast.error('Selecciona una nueva fecha y hora');
      return;
    }

    setIsModifying(true);
    try {
      const newFecha = format(selectedDate, 'yyyy-MM-dd');
      
      const { data, error } = await supabase.functions.invoke('modify-reservation', {
        body: {
          reserva_id: reserva.id,
          email: reserva.email,
          new_fecha: newFecha,
          new_hora: selectedTime,
        },
      });

      if (error) {
        console.error('Modification error:', error);
        toast.error('Error al modificar la cita. Intenta nuevamente.');
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['reservas'] });
      queryClient.invalidateQueries({ queryKey: ['reserva-by-email'] });
      queryClient.invalidateQueries({ queryKey: ['booked-hours'] });
      
      setModified(true);
      setShowModifyForm(false);
      toast.success('Tu cita ha sido modificada correctamente');
    } catch (error) {
      console.error('Modify booking error:', error);
      toast.error('Error al modificar la cita. Intenta nuevamente.');
    } finally {
      setIsModifying(false);
    }
  };

  if (cancelled) {
    return (
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Cita cancelada</h2>
          <p className="text-muted-foreground">
            Tu cita ha sido cancelada exitosamente.
          </p>
        </div>
        <Button onClick={onBack} variant="outline" size="lg" className="w-full">
          Volver al inicio
        </Button>
      </div>
    );
  }

  if (modified) {
    return (
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Cita modificada</h2>
          <p className="text-muted-foreground">
            Tu cita ha sido modificada exitosamente.
          </p>
          {selectedDate && selectedTime && (
            <div className="bg-card border border-border rounded-lg p-4 mt-4">
              <p className="text-sm text-muted-foreground">Nueva fecha y hora:</p>
              <p className="font-semibold capitalize">
                {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })} a las {selectedTime.substring(0, 5)}
              </p>
            </div>
          )}
        </div>
        <Button onClick={onBack} variant="outline" size="lg" className="w-full">
          Volver al inicio
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={showModifyForm ? () => setShowModifyForm(false) : onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {showModifyForm ? 'Volver a mi reserva' : 'Volver'}
      </button>

      {showModifyForm && reserva ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Modificar cita</h2>
            <p className="text-muted-foreground">
              Selecciona una nueva fecha y hora para tu cita.
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-4 space-y-2">
            <p className="text-sm text-muted-foreground">Cita actual:</p>
            <p className="font-semibold">{reserva.servicio}</p>
            <p className="text-sm capitalize">
              {format(parseISO(reserva.fecha), "EEEE d 'de' MMMM", { locale: es })} a las {reserva.hora.substring(0, 5)}
            </p>
          </div>

          <BookingCalendar
            selected={selectedDate}
            onSelect={(date) => {
              setSelectedDate(date);
              setSelectedTime(null);
            }}
          />

          {selectedDate && (
            <TimeSlots
              date={selectedDate}
              selected={selectedTime}
              onSelect={setSelectedTime}
            />
          )}

          {selectedDate && selectedTime && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Nueva cita:</p>
              <p className="capitalize">
                {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })} a las {selectedTime.substring(0, 5)}
              </p>
            </div>
          )}

          <Button
            onClick={handleModify}
            className="w-full bg-[#F9A825] hover:bg-[#F57F17] text-white"
            disabled={isModifying || !selectedDate || !selectedTime}
          >
            <Edit className="w-4 h-4 mr-2" />
            {isModifying ? 'Modificando...' : 'Confirmar modificación'}
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Gestionar mi cita</h2>
            <p className="text-muted-foreground">
              Ingresa tu email para buscar tu reserva.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSearch)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search-email">Email</Label>
              <Input
                id="search-email"
                type="email"
                placeholder="tucorreo@gmail.com"
                {...register('email')}
                className="bg-card"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              <Search className="w-4 h-4 mr-2" />
              Buscar reserva
            </Button>
          </form>

          {searchEmail && !isLoading && (
            <>
              {reserva ? (
                <div className="space-y-4">
                  <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                    <h3 className="font-semibold">Tu reserva</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Nombre</span>
                        <span className="font-medium">{reserva.nombre}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Servicio</span>
                        <span className="font-medium">{reserva.servicio}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fecha</span>
                        <span className="font-medium capitalize">
                          {format(parseISO(reserva.fecha), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Hora</span>
                        <span className="font-medium">{reserva.hora.substring(0, 5)}</span>
                      </div>
                      <div className="border-t pt-3 flex justify-between">
                        <span className="text-muted-foreground">Precio</span>
                        <span className="font-bold">{formatPrice(reserva.precio)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => setShowCancelConfirm(true)}
                      variant="destructive"
                      className="w-full bg-[#D32F2F] hover:bg-[#B71C1C] text-white"
                      disabled={isDeleting}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Cancelar cita
                    </Button>
                    
                    <Button
                      onClick={() => setShowModifyForm(true)}
                      className="w-full bg-[#F9A825] hover:bg-[#F57F17] text-white"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Modificar cita
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No se encontró ninguna reserva futura con este email.
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              ¿Cancelar tu cita?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Tu horario quedará disponible para otros clientes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-[#D32F2F] hover:bg-[#B71C1C] text-white"
              disabled={isDeleting}
            >
              {isDeleting ? 'Cancelando...' : 'Sí, cancelar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
