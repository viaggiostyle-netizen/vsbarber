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

// Time slots configuration by day of week (0 = Sunday, 1 = Monday, etc.)
const WEEKDAY_FULL_SLOTS = [
  '09:00', '09:40', '10:00', '10:40', '11:00', '11:40',
  '12:00', '12:40', '13:00', '13:40',
  // Pausa
  '15:00', '15:40', '16:00', '16:40', '17:00', '17:40',
  '18:00', '18:40', '19:00', '19:40', '20:00', '20:40',
];

const WEEKDAY_SHORT_SLOTS = [
  '09:00', '09:40', '10:00', '10:40', '11:00', '11:40',
  '12:00', '12:40', '13:00', '13:40',
  // Pausa
  '15:00', '15:40', '16:00', '16:40',
];

export const SCHEDULE_SLOTS: Record<number, string[]> = {
  0: [], // Domingo - cerrado
  1: WEEKDAY_FULL_SLOTS, // Lunes
  2: WEEKDAY_FULL_SLOTS, // Martes
  3: WEEKDAY_SHORT_SLOTS, // Miércoles
  4: WEEKDAY_FULL_SLOTS, // Jueves
  5: WEEKDAY_SHORT_SLOTS, // Viernes
  6: WEEKDAY_FULL_SLOTS, // Sábado
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
  return SCHEDULE_SLOTS[dayOfWeek] || [];
}
