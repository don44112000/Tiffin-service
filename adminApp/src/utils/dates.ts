import { format, addDays, startOfMonth, endOfMonth } from 'date-fns';

/**
 * Safely parse a date string that could be:
 * - YYYY-MM-DD (plain date)
 * - Full ISO timestamp (2026-04-11T18:30:00.000Z)
 * - Date object
 */
function toDate(date: Date | string): Date {
  if (date instanceof Date) return date;
  if (typeof date === 'string') {
    // Already an ISO timestamp — parse directly
    if (date.includes('T')) return new Date(date);
    // Plain YYYY-MM-DD — append T00:00:00 to avoid timezone shift
    return new Date(date + 'T00:00:00');
  }
  return new Date();
}

export function formatDisplayDate(date: Date | string): string {
  return format(toDate(date), 'EEEE, MMM d');
}

export function formatShortDate(date: Date | string): string {
  return format(toDate(date), 'MMM d');
}

export function formatFullDate(date: Date | string): string {
  return format(toDate(date), 'EEEE, MMM d, yyyy');
}

export function formatMonthYear(date: Date): string {
  return format(date, 'MMMM yyyy');
}

export function formatTime(isoString: string): string {
  if (!isoString) return '';
  try {
    return format(new Date(isoString), 'h:mm a');
  } catch {
    return '';
  }
}

export function getToday(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function getTomorrow(): string {
  return format(addDays(new Date(), 1), 'yyyy-MM-dd');
}

export function getMonthRange(year: number, month: number): { start: string; end: string } {
  const d = new Date(year, month - 1, 1);
  return {
    start: format(startOfMonth(d), 'yyyy-MM-dd'),
    end: format(endOfMonth(d), 'yyyy-MM-dd'),
  };
}

export function getCurrentSlot(): 'lunch' | 'dinner' {
  const hour = new Date().getHours();
  return hour < 14 ? 'lunch' : 'dinner';
}
