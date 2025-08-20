import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Search,
  Calendar,
  Users,
  MapPin,
  Filter,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function AccountHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch user's signup attempts and events - simplified query
  const { data: attemptEvents, isLoading } = useQuery({
    queryKey: ['user-attempt-events'],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('attempt_events')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  // Fetch captcha events
  const { data: captchaEvents } = useQuery({
    queryKey: ['user-captcha-events'],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('captcha_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  // Fetch queue events - simplified query
  const { data: queueEvents } = useQuery({
    queryKey: ['user-queue-events'],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('queue_events')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  const getStatusInfo = (status: string, eventType?: string) => {
    if (eventType === 'captcha_detected') {
      return {
        icon: AlertTriangle,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        label: 'CAPTCHA',
        description: 'CAPTCHA challenge required'
      };
    }
    
    if (eventType?.includes('queue')) {
      return {
        icon: Clock,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        label: 'Queued',
        description: 'Added to registration queue'
      };
    }

    switch (status) {
      case 'success':
      case 'completed':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          label: 'Success',
          description: 'Registration completed'
        };
      case 'failed':
      case 'error':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          label: 'Failed',
          description: 'Registration failed'
        };
      case 'pending':
        return {
          icon: Clock,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          label: 'Pending',
          description: 'In progress'
        };
      default:
        return {
          icon: AlertTriangle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          label: 'Unknown',
          description: 'Status unknown'
        };
    }
  };

  const renderAttemptCard = (attempt: any) => {
    const statusInfo = getStatusInfo(attempt.success_indicator ? 'success' : 'failed', attempt.event_type);
    const StatusIcon = statusInfo.icon;
    const metadata = attempt.metadata as any;
    const sessionName = metadata?.session_name || attempt.event_type || 'Unknown Event';
    const location = metadata?.location || 'Unknown Location';

    return (
      <Card key={attempt.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className={`p-2 rounded-full ${statusInfo.bgColor}`}>
                <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
              </div>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{sessionName}</h3>
                  <Badge variant="outline" className={statusInfo.color}>
                    {statusInfo.label}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {location}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(attempt.created_at).toLocaleDateString()}
                  </div>
                </div>
                
                {attempt.failure_reason && (
                  <p className="text-sm text-red-600">{attempt.failure_reason}</p>
                )}
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Type: {attempt.event_type}</span>
                  {attempt.latency_ms && <span>Response: {attempt.latency_ms}ms</span>}
                </div>
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(`/sessions/${(attempt.metadata as any)?.session_id || ''}`)}
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderCaptchaCard = (captcha: any) => {
    const statusInfo = getStatusInfo(captcha.status, 'captcha_detected');
    const StatusIcon = statusInfo.icon;
    const meta = captcha.meta as any;
    const sessionName = meta?.session_name || 'CAPTCHA Event';
    const location = meta?.location || 'Unknown Location';

    return (
      <Card key={captcha.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className={`p-2 rounded-full ${statusInfo.bgColor}`}>
                <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
              </div>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{sessionName}</h3>
                  <Badge variant="outline" className={statusInfo.color}>
                    {captcha.status}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {location}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(captcha.detected_at).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <span>Provider: {captcha.provider || 'Unknown'}</span>
                  {captcha.expires_at && (
                    <span className="ml-4">
                      Expires: {new Date(captcha.expires_at).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(`/sessions/${captcha.session_id}`)}
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const filteredAttempts = attemptEvents?.filter(attempt => {
    const metadata = attempt.metadata as any;
    const sessionName = metadata?.session_name || attempt.event_type || '';
    const matchesSearch = sessionName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'success' && attempt.success_indicator) ||
      (statusFilter === 'failed' && !attempt.success_indicator);
    return matchesSearch && matchesStatus;
  }) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-semibold mb-2">Loading Your History</h2>
            <p className="text-muted-foreground">Retrieving your registration attempts...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">Account History</h1>
          <p className="text-muted-foreground">
            Track all your registration attempts, successes, and challenges
          </p>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search sessions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="all">All Statuses</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for different event types */}
        <Tabs defaultValue="attempts" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="attempts">
              Registration Attempts ({attemptEvents?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="captcha">
              CAPTCHA Events ({captchaEvents?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="queue">
              Queue Events ({queueEvents?.length || 0})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="attempts" className="space-y-4">
            {filteredAttempts.length > 0 ? (
              filteredAttempts.map(renderAttemptCard)
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Registration Attempts</h3>
                  <p className="text-muted-foreground">
                    You haven't attempted any registrations yet.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="captcha" className="space-y-4">
            {captchaEvents && captchaEvents.length > 0 ? (
              captchaEvents.map(renderCaptchaCard)
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No CAPTCHA Events</h3>
                  <p className="text-muted-foreground">
                    No CAPTCHA challenges have been encountered.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="queue" className="space-y-4">
            {queueEvents && queueEvents.length > 0 ? (
              queueEvents.map((queueEvent: any) => (
                <Card key={queueEvent.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-blue-50">
                        <Clock className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{queueEvent.event_type}</h3>
                        <p className="text-sm text-muted-foreground">{queueEvent.message}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                          <span>{new Date(queueEvent.created_at).toLocaleString()}</span>
                          {queueEvent.position && <span>Position: {queueEvent.position}</span>}
                          {queueEvent.estimated_wait && <span>Wait: {queueEvent.estimated_wait}</span>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Queue Events</h3>
                  <p className="text-muted-foreground">
                    You haven't been placed in any registration queues.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}