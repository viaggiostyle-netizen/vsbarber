import { cn } from '@/lib/utils';
import { generateTimeSlots } from '@/lib/constants';
import { useReservasByDate } from '@/hooks/useReservas';

interface TimeSlotsProps {
  date: Date;
  selected: string | null;
  onSelect: (time: string) => void;
}

export function TimeSlots({ date, selected, onSelect }: TimeSlotsProps) {
  const { data: bookedSlots = [], isLoading } = useReservasByDate(date);
  const allSlots = generateTimeSlots(date);

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
        // Normalize the slot format for comparison (remove seconds if present in bookedSlots)
        const isBooked = bookedSlots.some(booked => {
          const normalizedBooked = booked.substring(0, 5);
          return normalizedBooked === slot;
        });
        const isSelected = selected === slot;

        return (
          <button
            key={slot}
            onClick={() => !isBooked && onSelect(slot)}
            disabled={isBooked}
            className={cn(
              'py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              isBooked && 'bg-muted text-muted-foreground line-through cursor-not-allowed opacity-50',
              isSelected && !isBooked && 'bg-foreground text-background',
              !isSelected && !isBooked && 'bg-card border border-border hover:border-foreground/50'
            )}
          >
            {slot}
          </button>
        );
      })}
    </div>
  );
}
