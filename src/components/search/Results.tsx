import React, { useState } from 'react';
import type { ActivityResult, SessionItem } from './types';
import { format, formatDistance } from 'date-fns';
import { Calendar, Clock, MapPin, DollarSign, ExternalLink } from 'lucide-react';
import { AddSessionModal } from './AddSessionModal';
import ReserveModal from '../reserve/ReserveModal';
import { RegistrationStatus } from './RegistrationStatus';

function SessionCard({ session, onReserve }: { 
  session: SessionItem; 
  onReserve: (sessionId: string) => void;
}) {
  const startDate = session.start ? new Date(session.start) : null;
  const endDate = session.end ? new Date(session.end) : null;
  
  const duration = startDate && endDate 
    ? formatDistance(endDate, startDate)
    : 'Duration varies';

  return (
    <div className="border border-border rounded-lg p-4 bg-card hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              {startDate ? format(startDate, 'MMM d, yyyy') : 'Date varies'}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{duration}</span>
          </div>

          {session.price_min && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              <span>${session.price_min}</span>
            </div>
          )}

          <RegistrationStatus session={session} />
        </div>

        <div className="flex items-center gap-3 justify-end">
          <button 
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium text-sm flex items-center gap-2"
            onClick={() => window.location.href = `/sessions/${session.id}`}
          >
            <ExternalLink className="w-4 h-4" />
            View details
          </button>
        </div>
      </div>
    </div>
  );
}

function ActivityCard({ activity, onReserve }: { 
  activity: ActivityResult; 
  onReserve: (sessionId: string) => void;
}) {
  const upcomingSessions = activity.sessions.slice(0, 3);
  const hasMoreSessions = activity.sessions.length > 3;
  
  // Calculate price range
  const prices = activity.sessions
    .map(s => s.price_min)
    .filter((p): p is number => p !== null);
  
  const priceRange = prices.length > 0 
    ? prices.length === 1 
      ? `$${prices[0]}`
      : `$${Math.min(...prices)} - $${Math.max(...prices)}`
    : 'Price varies';

  return (
    <div className="border border-border rounded-xl p-6 bg-card shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-foreground leading-tight">
            {activity.name}
          </h3>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>
              {activity.city}
              {activity.state && `, ${activity.state}`}
            </span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-lg font-semibold text-foreground">
            {priceRange}
          </div>
          <div className="text-sm text-muted-foreground">
            {activity.sessions.length} session{activity.sessions.length !== 1 ? 's' : ''} available
          </div>
        </div>
      </div>

      {/* Sessions */}
      <div className="space-y-3">
        {upcomingSessions.map(session => (
          <SessionCard 
            key={session.id} 
            session={session} 
            onReserve={onReserve}
          />
        ))}
        
        {hasMoreSessions && (
          <div className="text-center py-2">
            <span className="text-sm text-muted-foreground">
              + {activity.sessions.length - 3} more upcoming sessions
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Results({ items, loading, error }:{
  items: ActivityResult[];
  loading: boolean;
  error: string | null;
}) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [reserveModalOpen, setReserveModalOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');

  const handleReserve = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setReserveModalOpen(true);
  };


  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <div className="text-foreground">Searching for camps...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="py-12 text-center">
        <div className="text-destructive font-medium mb-2">Search Error</div>
        <div className="text-muted-foreground">{error}</div>
      </div>
    );
  }
  
  if (!items?.length) {
    return (
      <div className="py-12 text-center space-y-4">
        <div className="text-lg font-medium text-foreground">No camps found</div>
        <p className="text-muted-foreground max-w-md mx-auto">
          Try broadening your search criteria or clear some filters. You can also add a session manually and we'll try to reserve it for you.
        </p>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Add a session manually
        </button>
        
        <AddSessionModal 
          open={isAddModalOpen} 
          onOpenChange={setIsAddModalOpen} 
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      

      {/* Results grid - mobile first */}
      <div className="grid gap-6">
        {items.map(activity => (
          <ActivityCard 
            key={activity.activity_id} 
            activity={activity} 
            onReserve={handleReserve}
          />
        ))}
      </div>
      
      <ReserveModal
        open={reserveModalOpen}
        onClose={() => setReserveModalOpen(false)}
        sessionId={selectedSessionId}
      />
    </div>
  );
}