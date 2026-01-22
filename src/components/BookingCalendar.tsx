import { Calendar } from '@/components/ui/calendar';
import { getMinDate, SCHEDULE_SLOTS } from '@/lib/constants';
import { isSunday, isBefore, startOfDay, isWithinInterval, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMemo } from 'react';
import { useVacationBlocksForCalendar } from '@/hooks/useIsDateBlocked';

interface BookingCalendarProps {
  selected: Date | undefined;
  onSelect: (date: Date | undefined) => void;
}

export function BookingCalendar({ selected, onSelect }: BookingCalendarProps) {
  const minDate = useMemo(() => getMinDate(), []);
  const { data: vacationBlocks = [] } = useVacationBlocksForCalendar();

  const isDateInVacation = (date: Date) => {
    return vacationBlocks.some(block => {
      const start = parseISO(block.fecha_inicio);
      const end = parseISO(block.fecha_fin);
      return isWithinInterval(startOfDay(date), { start: startOfDay(start), end: startOfDay(end) });
    });
  };

  const disabledDays = (date: Date) => {
    // Disable dates before today
    if (isBefore(startOfDay(date), startOfDay(minDate))) {
      return true;
    }
    
    // Disable Sundays
    if (isSunday(date)) {
      return true;
    }
    
    // Disable days with no schedule
    const dayOfWeek = date.getDay();
    const slots = SCHEDULE_SLOTS[dayOfWeek];
    if (!slots || slots.length === 0) {
      return true;
    }

    // Disable vacation blocked dates
    if (isDateInVacation(date)) {
      return true;
    }
    
    return false;
  };

  return (
    <div className="flex justify-center">
      <Calendar
        mode="single"
        selected={selected}
        onSelect={onSelect}
        disabled={disabledDays}
        locale={es}
        className="rounded-lg border bg-card p-3 pointer-events-auto"
        fromDate={minDate}
        modifiers={{
          vacation: (date) => isDateInVacation(date),
        }}
        modifiersClassNames={{
          vacation: 'bg-destructive/20 text-destructive line-through',
        }}
      />
    </div>
  );
}
