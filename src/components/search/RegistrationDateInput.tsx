import React, { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, Edit3 } from 'lucide-react';

interface RegistrationDateInputProps {
  sessionId: string;
  onDateSubmit: (sessionId: string, date: string) => void;
}

export function RegistrationDateInput({ sessionId, onDateSubmit }: RegistrationDateInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [date, setDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (date) {
      onDateSubmit(sessionId, date);
      setIsEditing(false);
    }
  };

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 group"
      >
        <Edit3 className="w-3 h-3" />
        <span className="group-hover:underline">Add registration date</span>
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="text-xs border border-border rounded px-2 py-1 bg-background"
        autoFocus
      />
      <button
        type="submit"
        className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded hover:bg-primary/90"
      >
        Save
      </button>
      <button
        type="button"
        onClick={() => setIsEditing(false)}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        Cancel
      </button>
    </form>
  );
}