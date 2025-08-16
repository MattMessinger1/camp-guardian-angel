import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Activity, TrendingUp, Users, FileText, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MetricsSummary {
  summary: Record<string, Record<string, { value: number; recorded_at: string; metadata?: any }>>;
  health: Record<string, 'green' | 'yellow' | 'red'>;
  thresholds: Record<string, number>;
  last_updated: string;
}

export default function SystemDashboard() {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMetrics = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('metrics-collector', { method: 'GET' });
      if (error) throw error;
      setMetrics(data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      toast({ title: 'Error', description: 'Failed to fetch system metrics', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'green': return 'bg-green-100 text-green-800 border-green-200';
      case 'yellow': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'red': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">System Dashboard</h1>
            <p className="text-muted-foreground">Monitor public data ingestion, quality, and compliance metrics</p>
          </div>
          <Button onClick={fetchMetrics} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <Card className="mb-6 p-4 border-l-4 border-l-primary">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground mb-1">Data Sources Notice</p>
              <p className="text-muted-foreground">
                All listings are gathered from publicly available sources. Clicking any link will 
                take you to the official provider website. We respect robots.txt and apply 
                conservative rate limiting to all public data access.
              </p>
            </div>
          </div>
        </Card>

        {!metrics ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No metrics data available.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(metrics.health).map(([category, status]) => (
              <Card key={category} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground capitalize">
                      {category.replace('_', ' ')}
                    </p>
                    <Badge className={getHealthColor(status)}>
                      {status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}