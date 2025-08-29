import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  MapPin, 
  Users, 
  DollarSign, 
  Clock,
  ExternalLink,
  ArrowRight
} from 'lucide-react';

interface SessionCardProps {
  session: {
    id: string;
    title?: string | null;
    start_at?: string | null;
    end_at?: string | null;
    capacity?: number | null;
    upfront_fee_cents?: number | null;
    registration_open_at?: string | null;
    provider?: { name: string | null } | null;
    activities?: {
      name: string;
      city?: string;
      state?: string;
    } | null;
  };
  showGetReadyButton?: boolean;
  variant?: 'default' | 'compact';
}

export function SessionCard({ session, showGetReadyButton = true, variant = 'default' }: SessionCardProps) {
  const isRegistrationOpen = session.registration_open_at 
    ? new Date(session.registration_open_at) <= new Date()
    : false;
  
  const isUpcoming = session.registration_open_at 
    ? new Date(session.registration_open_at) > new Date()
    : true;

  const formatCurrency = (cents: number | null) => {
    if (typeof cents !== 'number') return '—';
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleString();
  };

  if (variant === 'compact') {
    return (
      <Card className="surface-card hover:surface-hover transition-colors">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">
                {session.activities?.name || session.title || 'Untitled Session'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {session.activities?.city && session.activities?.state
                  ? `${session.activities.city}, ${session.activities.state}`
                  : session.provider?.name || 'Unknown Provider'
                }
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(session.registration_open_at)}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2 ml-4">
              {isRegistrationOpen ? (
                <Badge variant="destructive">Registration Open</Badge>
              ) : isUpcoming ? (
                <Badge variant="secondary">Upcoming</Badge>
              ) : (
                <Badge variant="outline">TBD</Badge>
              )}
              {showGetReadyButton && isUpcoming && (
                <Button asChild size="sm" variant="outline">
                  <Link to={`/signup?sessionId=${session.id}`}>
                    Get Ready
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="surface-card hover:surface-hover transition-colors h-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="line-clamp-2">
            {session.activities?.name || session.title || 'Untitled Session'}
          </CardTitle>
          {isRegistrationOpen ? (
            <Badge variant="destructive">Open Now</Badge>
          ) : isUpcoming ? (
            <Badge variant="secondary">Upcoming</Badge>
          ) : (
            <Badge variant="outline">TBD</Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Location */}
        {session.activities?.city && session.activities?.state && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{session.activities.city}, {session.activities.state}</span>
          </div>
        )}

        {/* Provider */}
        {session.provider?.name && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Provider:</span> {session.provider.name}
          </div>
        )}

        {/* Registration Time */}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-orange-600" />
          <div>
            <div className="font-medium text-orange-600">Registration Opens:</div>
            <div className="text-muted-foreground text-xs">
              {formatDateTime(session.registration_open_at)}
            </div>
          </div>
        </div>

        {/* Session Dates */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <div>
            <div className="font-medium">Session Dates:</div>
            <div className="text-xs">
              {session.start_at ? (
                <>
                  {formatDate(session.start_at)}
                  {session.end_at && ` – ${formatDate(session.end_at)}`}
                </>
              ) : (
                'Dates TBD'
              )}
            </div>
          </div>
        </div>

        {/* Capacity & Fee */}
        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <div>
              <div className="font-medium">Capacity:</div>
              <div className="text-xs">{session.capacity ?? '—'}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <div>
              <div className="font-medium">Signup Fee:</div>
              <div className="text-xs">{formatCurrency(session.upfront_fee_cents)}</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {showGetReadyButton && isUpcoming ? (
            <Button asChild className="flex-1" variant="default">
              <Link to={`/signup?sessionId=${session.id}`}>
                <ArrowRight className="h-4 w-4 mr-2" />
                Get Ready for Signup
              </Link>
            </Button>
          ) : isRegistrationOpen ? (
            <Button asChild className="flex-1" variant="destructive">
              <Link to={`/signup?sessionId=${session.id}`}>
                Register Now
              </Link>
            </Button>
          ) : (
            <Button asChild className="flex-1" variant="outline">
              <Link to={`/sessions/${session.id}`}>
                <ExternalLink className="h-4 w-4 mr-2" />
                View Details
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}