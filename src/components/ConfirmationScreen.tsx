import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/constants';
import { CheckCircle, Calendar, Clock, Scissors, CreditCard, User } from 'lucide-react';

interface ConfirmationScreenProps {
  reserva: {
    nombre: string;
    servicio: string;
    fecha: string;
    hora: string;
    precio: number;
  };
  onNewBooking: () => void;
}

export function ConfirmationScreen({ reserva, onNewBooking }: ConfirmationScreenProps) {
  return (
    <div className="text-center space-y-8">
      {/* Success icon */}
      <div className="flex justify-center">
        <div className="w-24 h-24 rounded-full bg-foreground/10 flex items-center justify-center animate-in zoom-in duration-300">
          <CheckCircle className="w-14 h-14 text-foreground" />
        </div>
      </div>

      {/* Success message */}
      <div className="space-y-2">
        <h2 className="text-3xl font-bold">¡Cita confirmada!</h2>
        <p className="text-muted-foreground text-lg">
          ¡Gracias por confiar en ViaggioStyle! Te esperamos.
        </p>
      </div>

      {/* Booking details card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="bg-foreground/5 px-6 py-4 border-b border-border">
          <h3 className="font-semibold text-lg">Detalles de tu reserva</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm text-muted-foreground">Nombre</p>
              <p className="font-semibold">{reserva.nombre}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
              <Scissors className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm text-muted-foreground">Servicio</p>
              <p className="font-semibold">{reserva.servicio}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
              <Calendar className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm text-muted-foreground">Fecha</p>
              <p className="font-semibold capitalize">{reserva.fecha}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
              <Clock className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm text-muted-foreground">Hora</p>
              <p className="font-semibold">{reserva.hora}</p>
            </div>
          </div>

          <div className="border-t border-border pt-4 mt-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-foreground text-background">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm text-muted-foreground">Total a pagar</p>
                <p className="text-2xl font-bold">{formatPrice(reserva.precio)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <Button onClick={onNewBooking} variant="outline" size="lg" className="w-full">
          Volver al inicio
        </Button>
      </div>
    </div>
  );
}
