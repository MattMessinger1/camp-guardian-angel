import { startOfWeek, addDays, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export function matchWeek(
  weekOfISO: string | Date,
  sessionStartISO: string | Date,
  tz: string = 'America/Chicago',
  offsetDays: number = 0
): boolean {
  const weekDate = typeof weekOfISO === 'string' ? new Date(weekOfISO) : weekOfISO;
  const sessionDate = typeof sessionStartISO === 'string' ? new Date(sessionStartISO) : sessionStartISO;

  if (!(weekDate instanceof Date) || isNaN(weekDate.getTime())) return false;
  if (!(sessionDate instanceof Date) || isNaN(sessionDate.getTime())) return false;

  const weekZoned = toZonedTime(weekDate, tz);
  const sessionZoned = toZonedTime(sessionDate, tz);

  const weekStart = startOfWeek(weekZoned, { weekStartsOn: 1 }); // Monday
  const windowStart = addDays(weekStart, offsetDays);
  const windowEnd = addDays(windowStart, 7);

  const t = sessionZoned.getTime();
  return t >= windowStart.getTime() && t < windowEnd.getTime();
}

export function getWeekKey(sessionStartISO: string | Date, tz: string = 'America/Chicago'): string {
  const sessionDate = typeof sessionStartISO === 'string' ? new Date(sessionStartISO) : sessionStartISO;
  
  if (!(sessionDate instanceof Date) || isNaN(sessionDate.getTime())) {
    return 'unknown';
  }

  const sessionZoned = toZonedTime(sessionDate, tz);
  const weekStart = startOfWeek(sessionZoned, { weekStartsOn: 1 }); // Monday
  
  return format(weekStart, 'yyyy-MM-dd');
}

export function groupSessionsByWeek<T extends { start_at?: string | null }>(
  sessions: T[], 
  tz: string = 'America/Chicago'
): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};
  
  for (const session of sessions) {
    if (!session.start_at) continue;
    
    const weekKey = getWeekKey(session.start_at, tz);
    if (!grouped[weekKey]) {
      grouped[weekKey] = [];
    }
    grouped[weekKey].push(session);
  }
  
  // Sort sessions within each week by start time
  Object.keys(grouped).forEach(weekKey => {
    grouped[weekKey].sort((a, b) => {
      if (!a.start_at || !b.start_at) return 0;
      return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
    });
  });
  
  return grouped;
}

export function getWeekLabel(weekKey: string): string {
  try {
    const weekStart = new Date(weekKey);
    const weekEnd = addDays(weekStart, 6);
    
    return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
  } catch {
    return 'Unknown Week';
  }
}
