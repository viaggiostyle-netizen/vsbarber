import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface TimeBlock {
  start: string; // HH:mm format
  end: string;   // HH:mm format
}

export interface DaySchedule {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  dayName: string;
  enabled: boolean;
  blocks: TimeBlock[];
}

// Local storage key for work schedule
const STORAGE_KEY = 'viaggiostyle_work_schedule';

const DEFAULT_SCHEDULE: DaySchedule[] = [
  { dayOfWeek: 0, dayName: 'Domingo', enabled: false, blocks: [] },
  { dayOfWeek: 1, dayName: 'Lunes', enabled: true, blocks: [
    { start: '09:00', end: '14:00' },
    { start: '15:00', end: '21:00' },
  ]},
  { dayOfWeek: 2, dayName: 'Martes', enabled: true, blocks: [
    { start: '09:00', end: '14:00' },
    { start: '15:00', end: '21:00' },
  ]},
  { dayOfWeek: 3, dayName: 'Miércoles', enabled: true, blocks: [
    { start: '09:00', end: '14:00' },
    { start: '15:00', end: '17:00' },
  ]},
  { dayOfWeek: 4, dayName: 'Jueves', enabled: true, blocks: [
    { start: '09:00', end: '14:00' },
    { start: '15:00', end: '21:00' },
  ]},
  { dayOfWeek: 5, dayName: 'Viernes', enabled: true, blocks: [
    { start: '09:00', end: '14:00' },
    { start: '15:00', end: '17:00' },
  ]},
  { dayOfWeek: 6, dayName: 'Sábado', enabled: true, blocks: [
    { start: '09:00', end: '14:00' },
    { start: '15:00', end: '21:00' },
  ]},
];

function getStoredSchedule(): DaySchedule[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading schedule from localStorage', e);
  }
  return DEFAULT_SCHEDULE;
}

function saveSchedule(schedule: DaySchedule[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
}

export function useWorkSchedule() {
  return useQuery({
    queryKey: ['work-schedule'],
    queryFn: async () => {
      return getStoredSchedule();
    },
  });
}

export function useUpdateDaySchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (daySchedule: DaySchedule) => {
      const schedule = getStoredSchedule();
      const index = schedule.findIndex(s => s.dayOfWeek === daySchedule.dayOfWeek);
      if (index === -1) throw new Error('Day not found');
      schedule[index] = daySchedule;
      saveSchedule(schedule);
      return daySchedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-schedule'] });
    },
  });
}

export function useResetSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      saveSchedule(DEFAULT_SCHEDULE);
      return DEFAULT_SCHEDULE;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-schedule'] });
    },
  });
}

// Generate time slots from schedule for a given day
export function generateTimeSlotsFromSchedule(schedule: DaySchedule, slotDuration: number = 40): string[] {
  if (!schedule.enabled) return [];
  
  const slots: string[] = [];
  
  for (const block of schedule.blocks) {
    const [startHour, startMin] = block.start.split(':').map(Number);
    const [endHour, endMin] = block.end.split(':').map(Number);
    
    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    while (currentMinutes < endMinutes) {
      const hour = Math.floor(currentMinutes / 60);
      const min = currentMinutes % 60;
      slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
      currentMinutes += slotDuration;
    }
  }
  
  return slots;
}
