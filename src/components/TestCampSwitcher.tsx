import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TEST_CAMP_SCENARIOS, type TestCampScenario } from '@/lib/test-scenarios';
import { Clock, MapPin, DollarSign, Users } from 'lucide-react';

interface TestCampSwitcherProps {
  className?: string;
}

export function TestCampSwitcher({ className }: TestCampSwitcherProps) {
  const navigate = useNavigate();
  const params = useParams();
  const currentSessionId = params.id || params.sessionId;
  
  const currentScenario = Object.values(TEST_CAMP_SCENARIOS).find(
    scenario => scenario.sessionData.id === currentSessionId
  );

  const handleScenarioChange = (scenarioId: string) => {
    const scenario = TEST_CAMP_SCENARIOS[scenarioId];
    if (scenario) {
      navigate(`/sessions/${scenario.sessionData.id}/ready-to-signup`);
    }
  };

  const getRegistrationStatus = (scenario: TestCampScenario) => {
    if (!scenario.sessionData.registration_open_at) {
      return { label: 'No Time Set', color: 'destructive' as const };
    }
    
    const openTime = new Date(scenario.sessionData.registration_open_at);
    const now = new Date();
    const diffHours = (openTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (diffHours <= 0) {
      return { label: 'Open Now', color: 'default' as const };
    } else if (diffHours <= 2) {
      return { label: 'Opens Soon', color: 'secondary' as const };
    } else if (diffHours <= 24) {
      return { label: 'Opens Today', color: 'outline' as const };
    } else {
      const days = Math.ceil(diffHours / 24);
      return { label: `Opens in ${days}d`, color: 'outline' as const };
    }
  };

  // Only show in development or when a test session is already loaded
  if (process.env.NODE_ENV === 'production' && !currentScenario) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">🧪 Test Camp Scenarios</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Switch Test Scenario:</label>
          <Select
            value={currentScenario?.id || ''}
            onValueChange={handleScenarioChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a test scenario..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TEST_CAMP_SCENARIOS).map(([id, scenario]) => (
                <SelectItem key={id} value={id}>
                  {scenario.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {currentScenario && (
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{currentScenario.name}</h4>
              <Badge variant={getRegistrationStatus(currentScenario).color}>
                {getRegistrationStatus(currentScenario).label}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground">
              {currentScenario.description}
            </p>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>{currentScenario.sessionData.activities.city}, {currentScenario.sessionData.activities.state}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{currentScenario.sessionData.platform}</span>
              </div>
              {currentScenario.sessionData.price_min && (
                <div className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  <span>${currentScenario.sessionData.price_min}+</span>
                </div>
              )}
              {currentScenario.sessionData.registration_open_at && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(currentScenario.sessionData.registration_open_at).toLocaleTimeString()}</span>
                </div>
              )}
            </div>

            {currentScenario.requirements && (
              <div className="text-xs bg-background/50 p-2 rounded">
                <div className="font-medium mb-1">Custom Requirements:</div>
                <div>Deposit: ${currentScenario.requirements.deposit_amount_cents / 100}</div>
                <div>Documents: {currentScenario.requirements.required_documents.join(', ')}</div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/sessions')}
          >
            Back to Sessions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}