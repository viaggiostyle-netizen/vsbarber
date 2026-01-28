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
      <div className="text-center py-8">
        <div className="inline-flex items-center gap-2 text-muted-foreground">
          <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
          <span>Cargando horarios...</span>
        </div>
      </div>
    );
  }

  if (allSlots.length === 0) {
    return (
      <div className="text-center py-8 px-4 bg-muted/50 rounded-xl">
        <p className="text-muted-foreground">
          No hay horarios disponibles para este día.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
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
              'py-3 px-2 rounded-xl text-sm font-medium transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              isUnavailable && 'bg-muted text-muted-foreground/40 line-through cursor-not-allowed',
              isSelected && !isUnavailable && 'bg-foreground text-background ring-2 ring-foreground ring-offset-2 ring-offset-background',
              !isSelected && !isUnavailable && 'bg-card border border-border hover:border-foreground/50 hover:bg-accent'
            )}
          >
            {slot}
          </button>
        );
      })}
    </div>
  );
}
