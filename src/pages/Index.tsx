import { useState } from 'react';
import { SERVICES } from '@/lib/constants';
import { ServiceCard } from '@/components/ServiceCard';
import { BookingForm } from '@/components/BookingForm';
import { ConfirmationScreen } from '@/components/ConfirmationScreen';
import { CancelBooking } from '@/components/CancelBooking';
import { Scissors } from 'lucide-react';

type Step = 'services' | 'booking' | 'confirmation' | 'cancel';

interface ConfirmedReserva {
  nombre: string;
  servicio: string;
  fecha: string;
  hora: string;
  precio: number;
}

const Index = () => {
  const [step, setStep] = useState<Step>('services');
  const [selectedService, setSelectedService] = useState<typeof SERVICES[number] | null>(null);
  const [confirmedReserva, setConfirmedReserva] = useState<ConfirmedReserva | null>(null);

  const handleServiceSelect = (service: typeof SERVICES[number]) => {
    setSelectedService(service);
    setStep('booking');
  };

  const handleBookingSuccess = (reserva: ConfirmedReserva) => {
    setConfirmedReserva(reserva);
    setStep('confirmation');
  };

  const handleNewBooking = () => {
    setStep('services');
    setSelectedService(null);
    setConfirmedReserva(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-lg mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <header className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-foreground flex items-center justify-center">
              <Scissors className="w-8 h-8 text-background" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">ViaggioStyle</h1>
          <p className="text-muted-foreground mt-2">Barbería Premium</p>
        </header>

        {/* Content */}
        <main>
          {step === 'services' && (
            <div className="space-y-6">
              <div className="space-y-3">
                {SERVICES.map((service) => (
                  <ServiceCard
                    key={service.id}
                    name={service.name}
                    description={service.description}
                    price={service.price}
                    selected={selectedService?.id === service.id}
                    onSelect={() => handleServiceSelect(service)}
                  />
                ))}
              </div>

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

          {step === 'booking' && selectedService && (
            <BookingForm
              serviceName={selectedService.name}
              servicePrice={selectedService.price}
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
