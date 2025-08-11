import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { CalendarIcon, Clock, Info } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

function useSEO(title: string, description: string, canonicalPath: string) {
  useState(() => {
    document.title = title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", description);
    else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = description;
      document.head.appendChild(m);
    }
    let link: HTMLLinkElement | null = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = `${window.location.origin}${canonicalPath}`;
  });
}

interface SessionFormData {
  title: string;
  location: string;
  capacity: number | null;
  upfront_fee_cents: number | null;
  high_demand: boolean;
  open_time_exact: boolean;
  start_at: Date | null;
  end_at: Date | null;
  registration_open_at: Date | null;
  provider_id: string | null;
}

export default function SessionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = Boolean(id);

  useSEO(
    `${isEdit ? 'Edit' : 'Create'} Session | CampRush`,
    `${isEdit ? 'Edit existing' : 'Create new'} camp session with precise scheduling.`,
    `/sessions/${isEdit ? `${id}/edit` : 'new'}`
  );

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<SessionFormData>({
    title: '',
    location: '',
    capacity: null,
    upfront_fee_cents: null,
    high_demand: false,
    open_time_exact: true,
    start_at: null,
    end_at: null,
    registration_open_at: null,
    provider_id: null,
  });

  // Get user's timezone with fallback to Chicago
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago';

  const formatDateTimeWithTimezone = (date: Date | null) => {
    if (!date) return '';
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: userTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      }).format(date);
    } catch {
      return format(date, 'yyyy-MM-dd HH:mm:ss');
    }
  };

  const DateTimePicker = ({ 
    label, 
    value, 
    onChange, 
    required = false,
    helperText 
  }: {
    label: string;
    value: Date | null;
    onChange: (date: Date | null) => void;
    required?: boolean;
    helperText?: string;
  }) => {
    const [date, setDate] = useState<Date | undefined>(value || undefined);
    const [time, setTime] = useState(value ? format(value, 'HH:mm:ss') : '09:00:00');
    const [isOpen, setIsOpen] = useState(false);

    const handleDateSelect = (selectedDate: Date | undefined) => {
      setDate(selectedDate);
      if (selectedDate) {
        const [hours, minutes, seconds] = time.split(':').map(Number);
        const combinedDateTime = new Date(selectedDate);
        combinedDateTime.setHours(hours, minutes, seconds, 0);
        onChange(combinedDateTime);
      } else {
        onChange(null);
      }
    };

    const handleTimeChange = (newTime: string) => {
      setTime(newTime);
      if (date) {
        const [hours, minutes, seconds] = newTime.split(':').map(Number);
        const combinedDateTime = new Date(date);
        combinedDateTime.setHours(hours, minutes, seconds, 0);
        onChange(combinedDateTime);
      }
    };

    return (
      <div className="space-y-2">
        <Label className={cn(required && "after:content-['*'] after:text-red-500 after:ml-1")}>
          {label}
        </Label>
        <div className="flex gap-2">
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "flex-1 justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateSelect}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <div className="flex items-center gap-2 flex-1">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Input
              type="time"
              step="1"
              value={time}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="font-mono"
            />
          </div>
        </div>
        {value && (
          <div className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
            {formatDateTimeWithTimezone(value)}
          </div>
        )}
        {helperText && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>{helperText}</span>
          </div>
        )}
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Session title is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.registration_open_at) {
      toast({
        title: "Validation Error", 
        description: "Registration open time is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const sessionData = {
        title: formData.title.trim(),
        location: formData.location.trim() || null,
        capacity: formData.capacity,
        upfront_fee_cents: formData.upfront_fee_cents,
        high_demand: formData.high_demand,
        open_time_exact: formData.open_time_exact,
        start_at: formData.start_at?.toISOString() || null,
        end_at: formData.end_at?.toISOString() || null,
        registration_open_at: formData.registration_open_at.toISOString(),
        provider_id: formData.provider_id,
      };

      let result;
      if (isEdit) {
        result = await supabase
          .from('sessions')
          .update(sessionData)
          .eq('id', id);
      } else {
        result = await supabase
          .from('sessions')
          .insert([sessionData]);
      }

      if (result.error) {
        throw result.error;
      }

      toast({
        title: "Success",
        description: `Session ${isEdit ? 'updated' : 'created'} successfully`,
      });

      navigate('/sessions');
    } catch (error: any) {
      console.error('Session save error:', error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEdit ? 'update' : 'create'} session`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto py-10">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{isEdit ? 'Edit' : 'Create'} Session</h1>
          <p className="text-muted-foreground">
            Configure session details with precise registration timing
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title" className="after:content-['*'] after:text-red-500 after:ml-1">
                    Session Title
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Summer Camp Week 1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Camp Sunshine, Lake Geneva"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="capacity">Capacity</Label>
                    <Input
                      id="capacity"
                      type="number"
                      min="1"
                      value={formData.capacity || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        capacity: e.target.value ? parseInt(e.target.value) : null 
                      })}
                      placeholder="Leave empty for unlimited"
                    />
                  </div>

                  <div>
                    <Label htmlFor="upfront_fee">Upfront Fee (cents)</Label>
                    <Input
                      id="upfront_fee"
                      type="number"
                      min="0"
                      value={formData.upfront_fee_cents || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        upfront_fee_cents: e.target.value ? parseInt(e.target.value) : null 
                      })}
                      placeholder="e.g., 5000 for $50.00"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="high_demand"
                    checked={formData.high_demand}
                    onCheckedChange={(checked) => setFormData({ 
                      ...formData, 
                      high_demand: Boolean(checked) 
                    })}
                  />
                  <Label htmlFor="high_demand" className="text-sm">
                    Mark as high-demand session
                  </Label>
                </div>
              </div>

              {/* Scheduling */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-lg font-semibold">Scheduling</h3>
                
                <DateTimePicker
                  label="Registration Opens At"
                  value={formData.registration_open_at}
                  onChange={(date) => setFormData({ ...formData, registration_open_at: date })}
                  required
                  helperText={formData.open_time_exact 
                    ? "We'll start preparing ~60s before this time and submit at the exact second."
                    : "We'll start preparing 2 minutes early and poll the provider page aggressively until open."
                  }
                />

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="open_time_exact"
                    checked={formData.open_time_exact}
                    onCheckedChange={(checked) => setFormData({ 
                      ...formData, 
                      open_time_exact: Boolean(checked) 
                    })}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="open_time_exact" className="text-sm">
                      I know the exact second registration opens
                    </Label>
                    <div className="text-xs text-muted-foreground">
                      If you're not sure of the exact second, we'll poll aggressively until the provider page shows registration is open.
                    </div>
                  </div>
                </div>

                <DateTimePicker
                  label="Session Start Time"
                  value={formData.start_at}
                  onChange={(date) => setFormData({ ...formData, start_at: date })}
                />

                <DateTimePicker
                  label="Session End Time"
                  value={formData.end_at}
                  onChange={(date) => setFormData({ ...formData, end_at: date })}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-6">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Saving...' : `${isEdit ? 'Update' : 'Create'} Session`}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/sessions')}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}