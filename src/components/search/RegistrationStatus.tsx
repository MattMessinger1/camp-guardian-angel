import React from 'react';
import { format, isPast, isFuture } from 'date-fns';
import { Calendar, Clock } from 'lucide-react';
import { RegistrationDateInput } from './RegistrationDateInput';

interface RegistrationStatusProps {
  session: {
    id: string;
    registration_open_at?: string | null;
  };
  onDateSubmit: (sessionId: string, date: string) => void;
}

export function RegistrationStatus({ session, onDateSubmit }: RegistrationStatusProps) {
  const { registration_open_at } = session;

  // If we have a registration date
  if (registration_open_at) {
    const regDate = new Date(registration_open_at);
    const formattedDate = format(regDate, 'M/d/yy');
    
    if (isPast(regDate)) {
      return (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>Registration Opened {formattedDate} - check with provider on availability</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="w-3 h-3" />
          <span>Registration Opens: {formattedDate}</span>
        </div>
      );
    }
  }

  // If we don't have a registration date, show the tracking message with option to add
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" />
        <span>Will post Registration date when available (we're tracking it)</span>
      </div>
      <RegistrationDateInput sessionId={session.id} onDateSubmit={onDateSubmit} />
    </div>
  );
}