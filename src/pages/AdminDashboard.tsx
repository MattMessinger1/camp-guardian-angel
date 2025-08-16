import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Database, Zap, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminDashboard() {
  const [refreshing, setRefreshing] = useState(false);
  const [concurrent, setConcurrent] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<any>(null);
  const { toast } = useToast();

  const handleRefreshMV = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('refresh-search-mv', {
        body: { 
          concurrent,
          admin_key: 'manual_refresh' // Simple admin auth
        }
      });

      if (error) throw error;

      setLastRefresh(data);
      toast({
        title: 'Success',
        description: `Materialized view refreshed in ${data.duration_ms}ms. Rows: ${data.row_count}`,
      });
    } catch (error) {
      console.error('Error refreshing MV:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh materialized view',
        variant: 'destructive'
      });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Database className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        </div>

        {/* Search Performance Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Search Materialized View</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Concurrent Refresh</span>
                <Switch 
                  checked={concurrent} 
                  onCheckedChange={setConcurrent}
                  disabled={refreshing}
                />
              </div>
              
              {lastRefresh && (
                <div className="space-y-2 p-3 bg-muted rounded-lg">
                  <div className="text-xs text-muted-foreground">Last Refresh</div>
                  <div className="text-sm">
                    <span className="font-medium">{lastRefresh.row_count}</span> rows in{' '}
                    <span className="font-medium">{lastRefresh.duration_ms}ms</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(lastRefresh.timestamp).toLocaleString()}
                  </div>
                </div>
              )}
              
              <Button 
                onClick={handleRefreshMV}
                disabled={refreshing}
                className="w-full"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh Now'}
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Performance Info</h3>
            </div>
            
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium">Materialized View Benefits:</span>
                <ul className="mt-1 text-muted-foreground list-disc list-inside">
                  <li>Pre-computed search vectors</li>
                  <li>Optimized indexes for fast queries</li>
                  <li>Sub-100ms search performance</li>
                  <li>No impact on session writes</li>
                </ul>
              </div>
              
              <div>
                <span className="font-medium">Refresh Schedule:</span>
                <p className="text-muted-foreground">
                  Automatic refresh daily at 2:00 AM via cron job
                </p>
              </div>
              
              <div>
                <span className="font-medium">Concurrent Refresh:</span>
                <p className="text-muted-foreground">
                  {concurrent ? 'Enabled - no blocking of reads/writes' : 'Disabled - faster but blocks access'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Usage Instructions */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">API Usage</h3>
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-medium">Fast Search Endpoint:</span>
              <code className="ml-2 px-2 py-1 bg-muted rounded text-xs">
                POST /functions/v1/fast-search
              </code>
            </div>
            <div>
              <span className="font-medium">Manual Refresh:</span>
              <code className="ml-2 px-2 py-1 bg-muted rounded text-xs">
                POST /functions/v1/refresh-search-mv
              </code>
            </div>
            <div className="text-muted-foreground">
              The fast-search endpoint automatically uses the materialized view for optimal performance.
              Expected query times are &lt;100ms for typical searches.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}