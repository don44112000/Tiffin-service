import { todayStr } from './dates';

export interface CutoffInfo {
  blocked: boolean;
  reason?: string;
}

/**
 * Checks if a meal action (skip, edit, add) is blocked by cutoff time rules.
 */
export function checkCutoff(date: string, slot: 'lunch' | 'dinner'): CutoffInfo {
  const today = todayStr();
  
  // Past dates are always blocked
  if (date < today) {
    return { 
      blocked: true, 
      reason: 'This date is in the past and cannot be modified.' 
    };
  }

  // Future dates (not today) are never blocked
  if (date > today) return { blocked: false };

  // For today's orders, check against slot-specific cutoff times
  const envTime = slot === 'lunch' 
    ? import.meta.env.VITE_LUNCH_CUTOFF_TIME 
    : import.meta.env.VITE_DINNER_CUTOFF_TIME;
    
  if (!envTime) return { blocked: false };

  const [hrs, mins] = envTime.split(':').map(Number);
  const now = new Date();
  const cutoff = new Date();
  cutoff.setHours(hrs, mins, 0, 0);

  if (now > cutoff) {
    const slotName = slot === 'lunch' ? 'Lunch' : 'Dinner';
    const formattedCutoff = formatAMPM(cutoff);
    return { 
      blocked: true, 
      reason: `The cutoff time for today's ${slotName} (${formattedCutoff}) has already passed.` 
    };
  }

  return { blocked: false };
}

/**
 * Formats a Date object into a human-readable 12-hour AM/PM string.
 */
function formatAMPM(date: Date) {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours || 12; // 0 becomes 12
  const minStr = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minStr} ${ampm}`;
}
