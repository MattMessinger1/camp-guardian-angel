import { startOfWeek, addDays } from 'date-fns';
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
