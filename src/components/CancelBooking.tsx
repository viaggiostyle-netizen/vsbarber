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
import { ArrowLeft, Search, Trash2, Edit, AlertTriangle, Mail, Calendar, Clock, Scissors, CreditCard, User } from 'lucide-react';
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
        <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
          <Trash2 className="w-10 h-10 text-destructive" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Cita cancelada</h2>
          <p className="text-muted-foreground">
            Tu cita ha sido cancelada exitosamente.
          </p>
        </div>
        <Button onClick={onBack} variant="outline" size="lg" className="w-full rounded-xl">
          Volver al inicio
        </Button>
      </div>
    );
  }

  if (modified) {
    return (
      <div className="text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-foreground/10 flex items-center justify-center">
          <Edit className="w-10 h-10 text-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Cita modificada</h2>
          <p className="text-muted-foreground">
            Tu cita ha sido modificada exitosamente.
          </p>
          {selectedDate && selectedTime && (
            <div className="bg-card border border-border rounded-xl p-4 mt-4">
              <p className="text-sm text-muted-foreground">Nueva fecha y hora:</p>
              <p className="font-semibold capitalize">
                {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })} a las {selectedTime.substring(0, 5)}
              </p>
            </div>
          )}
        </div>
        <Button onClick={onBack} variant="outline" size="lg" className="w-full rounded-xl">
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

          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
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
            <div className="bg-foreground/5 border border-foreground/20 rounded-xl p-4 space-y-2">
              <p className="text-sm font-medium">Nueva cita:</p>
              <p className="capitalize font-semibold">
                {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })} a las {selectedTime.substring(0, 5)}
              </p>
            </div>
          )}

          <Button
            onClick={handleModify}
            className="w-full h-14 rounded-xl text-lg font-semibold"
            disabled={isModifying || !selectedDate || !selectedTime}
          >
            <Edit className="w-5 h-5 mr-2" />
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
              <Label htmlFor="search-email" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                Email
              </Label>
              <Input
                id="search-email"
                type="email"
                placeholder="tucorreo@gmail.com"
                {...register('email')}
                className="h-12 rounded-xl bg-card"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full h-12 rounded-xl" disabled={isLoading}>
              <Search className="w-4 h-4 mr-2" />
              Buscar reserva
            </Button>
          </form>

          {searchEmail && !isLoading && (
            <>
              {reserva ? (
                <div className="space-y-4">
                  {/* Reservation card */}
                  <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="bg-foreground/5 px-5 py-3 border-b border-border">
                      <h3 className="font-semibold">Tu reserva</h3>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                          <User className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Nombre</p>
                          <p className="font-medium">{reserva.nombre}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                          <Scissors className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Servicio</p>
                          <p className="font-medium">{reserva.servicio}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                          <Calendar className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Fecha</p>
                          <p className="font-medium capitalize">
                            {format(parseISO(reserva.fecha), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                          <Clock className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Hora</p>
                          <p className="font-medium">{reserva.hora.substring(0, 5)}</p>
                        </div>
                      </div>

                      <div className="border-t border-border pt-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-foreground text-background">
                            <CreditCard className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">Precio</p>
                            <p className="text-xl font-bold">{formatPrice(reserva.precio)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => setShowCancelConfirm(true)}
                      variant="destructive"
                      className="w-full h-12 rounded-xl"
                      disabled={isDeleting}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                    
                    <Button
                      onClick={() => setShowModifyForm(true)}
                      className="w-full h-12 rounded-xl"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Modificar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 px-4 bg-muted/50 rounded-xl">
                  <p className="text-muted-foreground">
                    No se encontró ninguna reserva futura con este email.
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent className="bg-card rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              ¿Seguro que quieres cancelar tu cita?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Si cancelas tu cita no se podrá revertir el cambio. Si lo haces, asegúrate de avisarle al barbero para que él sepa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
              disabled={isDeleting}
            >
              {isDeleting ? 'Cancelando...' : 'Cancelar cita'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
