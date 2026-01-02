export const SERVICES = [
  {
    id: 'corte',
    name: 'Corte',
    description: 'Incluye perfilado de cejas simple',
    price: 7500,
  },
  {
    id: 'corte-barba',
    name: 'Corte + Barba',
    description: 'Corte completo + perfilado de barba',
    price: 10000,
  },
] as const;

export const MIN_DATE = new Date(2026, 0, 2); // January 2, 2026

export const SLOT_DURATION = 40; // minutes

// Schedule configuration by day of week (0 = Sunday, 1 = Monday, etc.)
export const SCHEDULE_CONFIG: Record<number, { start: string; end: string }[]> = {
  0: [], // Sunday - closed
  1: [ // Monday
    { start: '09:00', end: '11:00' },
    { start: '12:00', end: '13:40' },
    { start: '15:00', end: '18:40' },
    { start: '19:00', end: '20:40' },
  ],
  2: [ // Tuesday
    { start: '09:00', end: '11:00' },
    { start: '12:00', end: '13:40' },
    { start: '15:00', end: '18:40' },
    { start: '19:00', end: '20:40' },
  ],
  3: [ // Wednesday
    { start: '09:00', end: '11:00' },
    { start: '12:00', end: '16:40' },
  ],
  4: [ // Thursday
    { start: '09:00', end: '11:00' },
    { start: '12:00', end: '13:40' },
    { start: '15:00', end: '18:40' },
    { start: '19:00', end: '20:40' },
  ],
  5: [ // Friday
    { start: '09:00', end: '11:00' },
    { start: '12:00', end: '16:40' },
  ],
  6: [ // Saturday
    { start: '09:00', end: '11:00' },
    { start: '12:00', end: '13:40' },
    { start: '15:00', end: '18:40' },
    { start: '19:00', end: '20:40' },
  ],
};

export const ADMIN_EMAILS = [
  'camiloviaggio01@gmail.com',
  'viaggiostyle@gmail.com',
];

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(price);
}

export function generateTimeSlots(date: Date): string[] {
  const dayOfWeek = date.getDay();
  const blocks = SCHEDULE_CONFIG[dayOfWeek] || [];
  const slots: string[] = [];

  for (const block of blocks) {
    const [startHour, startMin] = block.start.split(':').map(Number);
    const [endHour, endMin] = block.end.split(':').map(Number);
    
    let currentHour = startHour;
    let currentMin = startMin;
    
    const endTime = endHour * 60 + endMin;
    
    while (currentHour * 60 + currentMin < endTime) {
      const timeStr = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
      slots.push(timeStr);
      
      currentMin += SLOT_DURATION;
      if (currentMin >= 60) {
        currentHour += Math.floor(currentMin / 60);
        currentMin = currentMin % 60;
      }
    }
  }

  return slots;
}
