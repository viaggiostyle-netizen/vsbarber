import { Calendar } from '@/components/ui/calendar';
import { getMinDate, SCHEDULE_SLOTS } from '@/lib/constants';
import { isSunday, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMemo } from 'react';

interface BookingCalendarProps {
  selected: Date | undefined;
  onSelect: (date: Date | undefined) => void;
}

export function BookingCalendar({ selected, onSelect }: BookingCalendarProps) {
  // Get today's date - recalculated on each render to stay current
  const minDate = useMemo(() => getMinDate(), []);

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
      />
    </div>
  );
}
