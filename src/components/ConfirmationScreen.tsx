import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/constants';
import { CheckCircle } from 'lucide-react';

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
      <div className="flex justify-center">
        <div className="w-20 h-20 rounded-full bg-foreground/10 flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-foreground" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold">¡Reserva confirmada!</h2>
        <p className="text-muted-foreground">
          Gracias por confiar en ViaggioStyle, te esperamos.
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 text-left space-y-4">
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
          <span className="font-medium capitalize">{reserva.fecha}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Hora</span>
          <span className="font-medium">{reserva.hora}</span>
        </div>
        <div className="border-t pt-4 flex justify-between">
          <span className="text-muted-foreground">Precio</span>
          <span className="text-xl font-bold">{formatPrice(reserva.precio)}</span>
        </div>
      </div>

      <Button onClick={onNewBooking} variant="outline" size="lg" className="w-full">
        Hacer otra reserva
      </Button>
    </div>
  );
}
