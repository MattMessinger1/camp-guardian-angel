/**
 * Reservation and Registration State Constants
 * 
 * This file provides a single source of truth for all reservation and registration
 * state management across the application. All server code should import these
 * constants instead of using hardcoded arrays.
 */

// Database enum values for reservations table
export const RESERVATION_STATES = {
  PENDING: 'pending' as const,
  NEEDS_USER_ACTION: 'needs_user_action' as const,
  CONFIRMED: 'confirmed' as const,
  FAILED: 'failed' as const
} as const;

// Active reservation states (non-terminal)
export const ACTIVE_RESERVATION_STATES = [
  RESERVATION_STATES.PENDING,
  RESERVATION_STATES.NEEDS_USER_ACTION
] as const;

// Terminal reservation states
export const TERMINAL_RESERVATION_STATES = [
  RESERVATION_STATES.CONFIRMED,
  RESERVATION_STATES.FAILED
] as const;

// All valid reservation states
export const ALL_RESERVATION_STATES = [
  ...ACTIVE_RESERVATION_STATES,
  ...TERMINAL_RESERVATION_STATES
] as const;

// Registration states (text field, more flexible)
export const REGISTRATION_STATES = {
  PENDING: 'pending' as const,
  SCHEDULED: 'scheduled' as const,
  ATTEMPTING: 'attempting' as const,
  RETRYING: 'retrying' as const,
  ACCEPTED: 'accepted' as const,
  FAILED: 'failed' as const
} as const;

// Active registration states (being processed or can be processed)
export const ACTIVE_REGISTRATION_STATES = [
  REGISTRATION_STATES.PENDING,
  REGISTRATION_STATES.SCHEDULED,
  REGISTRATION_STATES.ATTEMPTING,
  REGISTRATION_STATES.RETRYING
] as const;

// Terminal registration states
export const TERMINAL_REGISTRATION_STATES = [
  REGISTRATION_STATES.ACCEPTED,
  REGISTRATION_STATES.FAILED
] as const;

// All valid registration states
export const ALL_REGISTRATION_STATES = [
  ...ACTIVE_REGISTRATION_STATES,
  ...TERMINAL_REGISTRATION_STATES
] as const;

// Prewarm job states
export const PREWARM_STATES = {
  SCHEDULED: 'scheduled' as const,
  RUNNING: 'running' as const,
  COMPLETED: 'completed' as const,
  FAILED: 'failed' as const
} as const;

// CAPTCHA event states
export const CAPTCHA_STATES = {
  PENDING: 'pending' as const,
  SOLVED: 'solved' as const,
  EXPIRED: 'expired' as const,
  FAILED: 'failed' as const
} as const;

/**
 * Validates a reservation status against the database enum
 * @param status The status to validate
 * @returns true if valid, false otherwise
 */
export function isValidReservationStatus(status: string): status is keyof typeof RESERVATION_STATES {
  return ALL_RESERVATION_STATES.includes(status as any);
}

/**
 * Validates a registration status
 * @param status The status to validate
 * @returns true if valid, false otherwise
 */
export function isValidRegistrationStatus(status: string): status is keyof typeof REGISTRATION_STATES {
  return ALL_REGISTRATION_STATES.includes(status as any);
}

/**
 * Guard function for updating reservation status
 * Logs error and throws if invalid state
 */
export function validateReservationStatusUpdate(
  newStatus: string, 
  oldStatus: string | null, 
  reservationId: string
): void {
  if (!isValidReservationStatus(newStatus)) {
    const error = `Invalid reservation status transition: ${oldStatus} -> ${newStatus} for reservation ${reservationId}`;
    console.error(`[STATE_VALIDATION] ${error}`, {
      state_invalid: true,
      old_state: oldStatus,
      new_state: newStatus,
      reservation_id: reservationId
    });
    throw new Error(`Invalid reservation status: ${newStatus}`);
  }
}

/**
 * Guard function for updating registration status
 * Logs error and throws if invalid state
 */
export function validateRegistrationStatusUpdate(
  newStatus: string, 
  oldStatus: string | null, 
  registrationId: string
): void {
  if (!isValidRegistrationStatus(newStatus)) {
    const error = `Invalid registration status transition: ${oldStatus} -> ${newStatus} for registration ${registrationId}`;
    console.error(`[STATE_VALIDATION] ${error}`, {
      state_invalid: true,
      old_state: oldStatus,
      new_state: newStatus,
      registration_id: registrationId
    });
    throw new Error(`Invalid registration status: ${newStatus}`);
  }
}