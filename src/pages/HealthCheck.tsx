import { useHealthCheck } from '@/hooks/useHealthCheck';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

export default function HealthCheck() {
  const { healthStatus, loading, error, checkHealth } = useHealthCheck();

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">System Health Check</h1>
          <p className="text-muted-foreground">Internal system status and configuration</p>
        </div>
        <Button 
          onClick={checkHealth} 
          disabled={loading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {healthStatus && (
        <div className="grid gap-6">
          {/* Overall Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span>System Status</span>
                  </CardTitle>
                  <CardDescription>
                    Last checked: {new Date(healthStatus.timestamp).toLocaleString()}
                  </CardDescription>
                </div>
                <Badge variant={healthStatus.status === 'healthy' ? 'default' : 'destructive'}>
                  {healthStatus.status}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>Current system configuration and mode</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Public Mode:</span>
                    <Badge variant={healthStatus.publicMode ? 'default' : 'secondary'}>
                      {healthStatus.publicMode ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Private APIs:</span>
                    <Badge variant={healthStatus.privateApisBlocked ? 'destructive' : 'default'}>
                      {healthStatus.privateApisBlocked ? 'Blocked' : 'Available'}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Provider Mode:</span>
                    <Badge variant="outline">
                      {healthStatus.features.providerMode}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>VGS Proxy:</span>
                    <Badge variant={healthStatus.features.vgsProxy ? 'default' : 'secondary'}>
                      {healthStatus.features.vgsProxy ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle>Features</CardTitle>
              <CardDescription>Available system features</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Geocoding:</span>
                  <Badge variant={healthStatus.features.geocoding ? 'default' : 'secondary'}>
                    {healthStatus.features.geocoding ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Environment Keys */}
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>External service availability</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Active Network:</span>
                  <Badge variant={healthStatus.environment.hasActiveApiKey ? 'default' : 'secondary'}>
                    {healthStatus.environment.hasActiveApiKey ? 'Configured' : 'Not Set'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>CampMinder:</span>
                  <Badge variant={healthStatus.environment.hasCampminderKey ? 'default' : 'secondary'}>
                    {healthStatus.environment.hasCampminderKey ? 'Configured' : 'Not Set'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>OpenAI:</span>
                  <Badge variant={healthStatus.environment.hasOpenAiKey ? 'default' : 'secondary'}>
                    {healthStatus.environment.hasOpenAiKey ? 'Configured' : 'Not Set'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {loading && !healthStatus && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Checking system health...</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}