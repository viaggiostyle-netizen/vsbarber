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
import { ArrowLeft, Search, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const emailSchema = z.object({
  email: z.string().email('Ingresa un email válido'),
});

interface CancelBookingProps {
  onBack: () => void;
}

export function CancelBooking({ onBack }: CancelBookingProps) {
  const [searchEmail, setSearchEmail] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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
    setSearchEmail(data.email.toLowerCase());
  };

  const handleCancel = async () => {
    if (!reserva) return;

    setIsDeleting(true);
    try {
      // Call secure edge function that verifies email ownership and deletes
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

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['reservas'] });
      queryClient.invalidateQueries({ queryKey: ['reserva-by-email'] });
      
      setCancelled(true);
      toast.success('Tu cita ha sido cancelada correctamente');
    } catch (error) {
      console.error('Cancel booking error:', error);
      toast.error('Error al cancelar la cita. Intenta nuevamente.');
    } finally {
      setIsDeleting(false);
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

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver
      </button>

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

              <Button
                onClick={handleCancel}
                variant="destructive"
                className="w-full"
                disabled={isDeleting}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isDeleting ? 'Cancelando...' : 'Cancelar cita'}
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No se encontró ninguna reserva futura con este email.
            </div>
          )}
        </>
      )}
    </div>
  );
}