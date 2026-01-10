import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SERVICES, formatPrice } from '@/lib/constants';
import { ServiceCard } from '@/components/ServiceCard';
import { BookingForm } from '@/components/BookingForm';
import { ConfirmationScreen } from '@/components/ConfirmationScreen';
import { CancelBooking } from '@/components/CancelBooking';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { PushNotificationButton } from '@/components/PushNotificationButton';
import { useAuth } from '@/hooks/useAuth';
import { Settings, Scissors } from 'lucide-react';

type Step = 'services' | 'booking' | 'confirmation' | 'cancel';

interface ServiceSelection {
  service: typeof SERVICES[number];
  quantity: number;
}

interface ConfirmedReserva {
  nombre: string;
  servicio: string;
  fecha: string;
  hora: string;
  precio: number;
}

const Index = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [step, setStep] = useState<Step>('services');
  const [selections, setSelections] = useState<ServiceSelection[]>([]);
  const [confirmedReserva, setConfirmedReserva] = useState<ConfirmedReserva | null>(null);

  const handleAddService = (service: typeof SERVICES[number]) => {
    setSelections((prev) => {
      const existing = prev.find((s) => s.service.id === service.id);
      if (existing) {
        return prev.map((s) =>
          s.service.id === service.id ? { ...s, quantity: s.quantity + 1 } : s
        );
      }
      return [...prev, { service, quantity: 1 }];
    });
  };

  const handleRemoveService = (serviceId: string) => {
    setSelections((prev) => {
      const existing = prev.find((s) => s.service.id === serviceId);
      if (existing && existing.quantity > 1) {
        return prev.map((s) =>
          s.service.id === serviceId ? { ...s, quantity: s.quantity - 1 } : s
        );
      }
      return prev.filter((s) => s.service.id !== serviceId);
    });
  };

  const totalPrice = selections.reduce(
    (sum, s) => sum + s.service.price * s.quantity,
    0
  );

  const serviceSummary = selections
    .map((s) => (s.quantity > 1 ? `${s.service.name} x${s.quantity}` : s.service.name))
    .join(' + ');

  const handleContinue = () => {
    if (selections.length > 0) {
      setStep('booking');
    }
  };

  const handleBookingSuccess = (reserva: ConfirmedReserva) => {
    setConfirmedReserva(reserva);
    setStep('confirmation');
  };

  const handleNewBooking = () => {
    setStep('services');
    setSelections([]);
    setConfirmedReserva(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-lg mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <header className="mb-10">
          <div className="flex justify-end gap-2 mb-4">
            {isAdmin && (
              <>
                <PushNotificationButton />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigate('/control')}
                  className="border-primary/20 hover:bg-primary/10"
                  title="Panel de Admin"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </>
            )}
            <ThemeToggle />
          </div>
          <div className="text-center">
            <div className="flex justify-center mb-2">
              <Scissors className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight uppercase">ViaggioStyle</h1>
            <p className="text-muted-foreground mt-2">Eleva tu imagen. Reserva tu cita.</p>
          </div>
        </header>

        {/* Content */}
        <main>
          {step === 'services' && (
            <div className="space-y-6">
              <div className="space-y-3">
                {SERVICES.map((service) => {
                  const selection = selections.find((s) => s.service.id === service.id);
                  const quantity = selection?.quantity || 0;

                  return (
                    <ServiceCard
                      key={service.id}
                      name={service.name}
                      description={service.description}
                      price={service.price}
                      quantity={quantity}
                      onAdd={() => handleAddService(service)}
                      onRemove={() => handleRemoveService(service.id)}
                    />
                  );
                })}
              </div>

              {selections.length > 0 && (
                <div className="p-4 rounded-lg border border-border bg-card">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-muted-foreground">{serviceSummary}</span>
                    <span className="text-xl font-bold">{formatPrice(totalPrice)}</span>
                  </div>
                  <Button onClick={handleContinue} className="w-full">
                    Continuar
                  </Button>
                </div>
              )}

              <div className="pt-4 text-center">
                <button
                  onClick={() => setStep('cancel')}
                  className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
                >
                  ¿Ya tienes una cita? Haz click aquí para cancelar o modificar
                </button>
              </div>
            </div>
          )}

          {step === 'booking' && selections.length > 0 && (
            <BookingForm
              serviceName={serviceSummary}
              servicePrice={totalPrice}
              onSuccess={handleBookingSuccess}
              onBack={() => setStep('services')}
            />
          )}

          {step === 'confirmation' && confirmedReserva && (
            <ConfirmationScreen
              reserva={confirmedReserva}
              onNewBooking={handleNewBooking}
            />
          )}

          {step === 'cancel' && (
            <CancelBooking onBack={() => setStep('services')} />
          )}
        </main>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} ViaggioStyle. Todos los derechos reservados.</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
