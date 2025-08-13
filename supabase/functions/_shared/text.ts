import { startOfWeek, addDays, format } from "https://deno.land/x/date_fns@v2.22.1/index.js";
import { toZonedTime } from "https://deno.land/x/date_fns_tz@v2.0.0/index.js";

/**
 * Normalize camp names for consistent matching
 */
export function normalizeCampName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  return name
    .toLowerCase()
    .trim()
    // Remove common prefixes/suffixes
    .replace(/^(camp|the)\s+/i, '')
    .replace(/\s+(camp|center|academy|program)$/i, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Remove special characters but keep alphanumeric and spaces
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

/**
 * Convert a date to Monday-Friday range string for that week
 * Uses Central Time zone by default
 */
export function toMonFriRangeFromDate(
  dateISO: string, 
  tz: string = 'America/Chicago'
): string {
  try {
    const date = new Date(dateISO);
    
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format');
    }

    const zonedDate = toZonedTime(date, tz);
    
    // Get the start of the week (Monday)
    const weekStart = startOfWeek(zonedDate, { weekStartsOn: 1 });
    
    // Get Friday of the same week
    const weekEnd = addDays(weekStart, 4); // Monday + 4 days = Friday
    
    // Format as "Mon MM/DD - Fri MM/DD"
    const startFormatted = format(weekStart, 'EEE M/d');
    const endFormatted = format(weekEnd, 'EEE M/d');
    
    return `${startFormatted} - ${endFormatted}`;
  } catch (error) {
    console.error('Error formatting date range:', error);
    return 'Invalid date';
  }
}

/**
 * Get week boundaries for a given date
 */
export function getWeekBoundaries(
  dateISO: string, 
  tz: string = 'America/Chicago'
): { start: Date; end: Date } {
  const date = new Date(dateISO);
  
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date format');
  }

  const zonedDate = toZonedTime(date, tz);
  
  // Get the start of the week (Monday)
  const weekStart = startOfWeek(zonedDate, { weekStartsOn: 1 });
  
  // Get end of the week (Sunday)
  const weekEnd = addDays(weekStart, 6);
  
  return { start: weekStart, end: weekEnd };
}

/**
 * Check if a session date falls within a given week
 * Adapter for the existing weekOf logic
 */
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
