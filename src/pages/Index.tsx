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
import vsLogo from '@/assets/vs-logo-new.jpg';

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
      {/* Top navigation bar */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-foreground/10">
                <img src={vsLogo} alt="ViaggioStyle" className="w-full h-full object-cover" />
              </div>
              <span className="font-bold text-lg tracking-tight">ViaggioStyle</span>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <>
                  <PushNotificationButton />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/control')}
                    className="hover:bg-accent"
                    title="Panel de Admin"
                  >
                    <Settings className="h-5 w-5" />
                  </Button>
                </>
              )}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>

      <div className="container max-w-lg mx-auto px-4 py-8">
        {/* Hero Header */}
        {step === 'services' && (
          <header className="text-center mb-10 space-y-4">
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-foreground/10 shadow-lg">
                <img src={vsLogo} alt="ViaggioStyle" className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
                ViaggioStyle
              </h1>
              <p className="text-muted-foreground text-lg">
                Eleva tu imagen. Reserva tu cita.
              </p>
            </div>
          </header>
        )}

        {/* Content */}
        <main>
          {step === 'services' && (
            <div className="space-y-6">
              {/* Section title */}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Scissors className="w-5 h-5" />
                <span className="text-sm font-medium uppercase tracking-wide">Nuestros servicios</span>
              </div>

              {/* Services */}
              <div className="space-y-4">
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

              {/* Cart Summary */}
              {selections.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border p-4 shadow-lg z-40">
                  <div className="container max-w-lg mx-auto">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground line-clamp-1">{serviceSummary}</p>
                        <p className="text-2xl font-bold">{formatPrice(totalPrice)}</p>
                      </div>
                      <Button onClick={handleContinue} size="lg" className="px-8">
                        Continuar
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Manage booking link */}
              <div className={`pt-4 text-center ${selections.length > 0 ? 'pb-24' : ''}`}>
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
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Reserva tu cita</h2>
                <p className="text-muted-foreground">
                  Completa tus datos y selecciona fecha y hora.
                </p>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{serviceSummary}</span>
                  <span className="text-xl font-bold">{formatPrice(totalPrice)}</span>
                </div>
              </div>
              <BookingForm
                serviceName={serviceSummary}
                servicePrice={totalPrice}
                onSuccess={handleBookingSuccess}
                onBack={() => setStep('services')}
              />
            </div>
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
        <footer className={`mt-12 text-center text-sm text-muted-foreground ${step === 'services' && selections.length > 0 ? 'pb-24' : ''}`}>
          <p>© {new Date().getFullYear()} ViaggioStyle. Todos los derechos reservados.</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
