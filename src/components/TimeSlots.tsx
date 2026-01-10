import { cn } from '@/lib/utils';
import { generateTimeSlots } from '@/lib/constants';
import { useReservasByDate } from '@/hooks/useReservas';
import { useBlockedHours } from '@/hooks/useBlockedHours';

interface TimeSlotsProps {
  date: Date;
  selected: string | null;
  onSelect: (time: string) => void;
}

export function TimeSlots({ date, selected, onSelect }: TimeSlotsProps) {
  const { data: bookedSlots = [], isLoading: loadingBooked } = useReservasByDate(date);
  const { data: blockedSlots = [], isLoading: loadingBlocked } = useBlockedHours(date);
  const allSlots = generateTimeSlots(date);

  const isLoading = loadingBooked || loadingBlocked;

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Cargando horarios...
      </div>
    );
  }

  if (allSlots.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay horarios disponibles para este día.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
      {allSlots.map((slot) => {
        // Normalize the slot format for comparison (remove seconds if present)
        const isBooked = bookedSlots.some(booked => {
          const normalizedBooked = booked.substring(0, 5);
          return normalizedBooked === slot;
        });
        const isBlocked = blockedSlots.some(blocked => {
          const normalizedBlocked = blocked.substring(0, 5);
          return normalizedBlocked === slot;
        });
        const isUnavailable = isBooked || isBlocked;
        const isSelected = selected === slot;

        return (
          <button
            key={slot}
            onClick={() => !isUnavailable && onSelect(slot)}
            disabled={isUnavailable}
            className={cn(
              'py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              isUnavailable && 'bg-muted text-muted-foreground line-through cursor-not-allowed opacity-50',
              isSelected && !isUnavailable && 'bg-foreground text-background',
              !isSelected && !isUnavailable && 'bg-card border border-border hover:border-foreground/50'
            )}
          >
            {slot}
          </button>
        );
      })}
    </div>
  );
}
