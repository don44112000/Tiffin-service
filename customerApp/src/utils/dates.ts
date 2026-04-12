import { format, parseISO, startOfMonth, endOfMonth, isToday, isTomorrow, isYesterday } from 'date-fns';

export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'd MMM yyyy');
  } catch {
    return dateStr;
  }
}

export function formatShortDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'd MMM');
  } catch {
    return dateStr;
  }
}

export function formatTime(isoStr: string): string {
  try {
    return format(parseISO(isoStr), 'h:mm a');
  } catch {
    return '';
  }
}

export function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function tomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return format(d, 'yyyy-MM-dd');
}

export function monthStartStr(year: number, month: number): string {
  return format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
}

export function monthEndStr(year: number, month: number): string {
  return format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
}

export function getDayLabel(dateStr: string): string {
  try {
    const d = parseISO(dateStr);
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'EEEE, d MMM');
  } catch {
    return dateStr;
  }
}

export function getMonthLabel(year: number, month: number): string {
  return format(new Date(year, month - 1), 'MMMM yyyy');
}

export function addDays(dateStr: string, days: number): string {
  const d = parseISO(dateStr);
  d.setDate(d.getDate() + days);
  return format(d, 'yyyy-MM-dd');
}

export function getDaysInRange(_start: string, days: number): number {
  return days;
}
