import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TEST_CAMP_SCENARIOS, type TestCampScenario } from '@/lib/test-scenarios';
import { Clock, MapPin, DollarSign, Users } from 'lucide-react';

interface TestCampSwitcherProps {
  className?: string;
  mode?: 'ready-to-signup' | 'signup'; // New prop to determine navigation behavior
}

export function TestCampSwitcher({ className, mode = 'ready-to-signup' }: TestCampSwitcherProps) {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  
  // Get sessionId from either route params or search params
  const rawSessionId = params.id || params.sessionId || searchParams.get('sessionId');
  
  // Handle case where sessionId is the literal string "${sessionId}" or invalid
  const currentSessionId = rawSessionId === '${sessionId}' || !rawSessionId ? null : rawSessionId;
  
  const currentScenario = currentSessionId ? 
    Object.values(TEST_CAMP_SCENARIOS).find(scenario => scenario.sessionData.id === currentSessionId) : 
    null;
  
  // Default to first scenario if none found
  const selectedScenario = currentScenario || Object.values(TEST_CAMP_SCENARIOS)[0];
  const selectedScenarioKey = Object.keys(TEST_CAMP_SCENARIOS).find(
    key => TEST_CAMP_SCENARIOS[key] === selectedScenario
  ) || Object.keys(TEST_CAMP_SCENARIOS)[0];

  const handleScenarioChange = (scenarioId: string) => {
    const scenario = TEST_CAMP_SCENARIOS[scenarioId];
    if (scenario) {
      if (mode === 'signup') {
        navigate(`/signup?sessionId=${scenario.sessionData.id}`);
      } else {
        navigate(`/sessions/${scenario.sessionData.id}/ready-to-signup`);
      }
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

  // Always show test scenarios dropdown for easy switching

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">🧪 Test Camp Scenarios</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Switch Test Scenario:</label>
            <Select
              value={selectedScenarioKey}
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

        <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{selectedScenario.name}</h4>
            <Badge variant={getRegistrationStatus(selectedScenario).color}>
              {getRegistrationStatus(selectedScenario).label}
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground">
            {selectedScenario.description}
          </p>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{selectedScenario.sessionData.activities.city}, {selectedScenario.sessionData.activities.state}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{selectedScenario.sessionData.platform}</span>
            </div>
            {selectedScenario.sessionData.price_min && (
              <div className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                <span>${selectedScenario.sessionData.price_min}+</span>
              </div>
            )}
            {selectedScenario.sessionData.registration_open_at && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{new Date(selectedScenario.sessionData.registration_open_at).toLocaleTimeString()}</span>
              </div>
            )}
          </div>

          {selectedScenario.requirements && (
            <div className="text-xs bg-background/50 p-2 rounded">
              <div className="font-medium mb-1">Custom Requirements:</div>
              <div>Deposit: ${selectedScenario.requirements.deposit_amount_cents / 100}</div>
              <div>Documents: {selectedScenario.requirements.required_documents.join(', ')}</div>
            </div>
          )}
        </div>

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