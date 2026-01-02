import { Calendar } from '@/components/ui/calendar';
import { MIN_DATE, SCHEDULE_CONFIG } from '@/lib/constants';
import { isSunday, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

interface BookingCalendarProps {
  selected: Date | undefined;
  onSelect: (date: Date | undefined) => void;
}

export function BookingCalendar({ selected, onSelect }: BookingCalendarProps) {
  const disabledDays = (date: Date) => {
    // Disable dates before MIN_DATE
    if (isBefore(startOfDay(date), startOfDay(MIN_DATE))) {
      return true;
    }
    
    // Disable Sundays
    if (isSunday(date)) {
      return true;
    }
    
    // Disable days with no schedule
    const dayOfWeek = date.getDay();
    const schedule = SCHEDULE_CONFIG[dayOfWeek];
    if (!schedule || schedule.length === 0) {
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
        fromDate={MIN_DATE}
      />
    </div>
  );
}
