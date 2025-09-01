import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, MapPin, DollarSign } from "lucide-react";

interface SessionInfoProps {
  businessName?: string;
  location?: string;
  selectedDate?: string;
  selectedTime?: string;
  signupCost?: number;
  totalCost?: number;
  className?: string;
}

export function SessionInfo({
  businessName,
  location,
  selectedDate,
  selectedTime,
  signupCost,
  totalCost,
  className
}: SessionInfoProps) {
  // Don't render if no key info is available
  if (!businessName && !selectedDate && !selectedTime) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Selected Session
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {businessName && (
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
            <div>
              <div className="font-medium text-foreground">{businessName}</div>
              {location && (
                <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" />
                  {location}
                </div>
              )}
            </div>
          </div>
        )}

        {selectedDate && (
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium text-foreground">
                {formatDate(selectedDate)}
              </div>
              <div className="text-sm text-muted-foreground">Session Date</div>
            </div>
          </div>
        )}

        {selectedTime && (
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium text-foreground">{selectedTime}</div>
              <div className="text-sm text-muted-foreground">Session Time</div>
            </div>
          </div>
        )}

        {(signupCost || totalCost) && (
          <div className="pt-2 border-t border-border">
            {signupCost && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Due at signup:</span>
                <span className="font-medium text-foreground">${signupCost}</span>
              </div>
            )}
            {totalCost && totalCost !== signupCost && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total cost:</span>
                <span className="font-medium text-foreground">${totalCost}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}