import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const SanityCheck = () => {
  const { toast } = useToast();
  const [testSessionId] = useState('b6ac916f-0187-4658-be3b-5a07949c49be');
  const [testChildId, setTestChildId] = useState<string>(crypto.randomUUID());
  const [testUserId, setTestUserId] = useState<string>(crypto.randomUUID());

  const createTestChild = async () => {
    try {
      const { error } = await supabase
        .from('children')
        .insert({
          id: testChildId,
          user_id: testUserId,
          info_token: `test-token-${testChildId.substring(0, 8)}`
        });
      
      if (error) throw error;
      toast({ title: "Test child created", description: testChildId });
    } catch (error: any) {
      toast({ title: "Error creating test child", description: error.message, variant: "destructive" });
    }
  };

  const createTestBillingProfile = async () => {
    try {
      const { error } = await supabase
        .from('billing_profiles')
        .insert({
          user_id: testUserId,
          stripe_customer_id: 'cus_test_priority',
          default_payment_method_id: 'pm_test_priority'
        });
      
      if (error) throw error;
      toast({ title: "Test billing profile created" });
    } catch (error: any) {
      toast({ title: "Error creating billing profile", description: error.message, variant: "destructive" });
    }
  };

  const createPriorityRegistration = async () => {
    try {
      const { error } = await supabase
        .from('registrations')
        .insert({
          user_id: testUserId,
          child_id: testChildId,
          session_id: testSessionId,
          priority_opt_in: true,
          status: 'pending'
        });
      
      if (error) throw error;
      toast({ title: "Priority registration created", description: "priority_opt_in: true" });
    } catch (error: any) {
      toast({ title: "Error creating priority registration", description: error.message, variant: "destructive" });
    }
  };

  const createNormalRegistration = async () => {
    try {
      const normalUserId = crypto.randomUUID();
      const normalChildId = crypto.randomUUID();
      
      // Create normal user's child
      await supabase.from('children').insert({
        id: normalChildId,
        user_id: normalUserId,
        info_token: `test-token-${normalChildId.substring(0, 8)}`
      });

      // Create normal user's billing profile
      await supabase.from('billing_profiles').insert({
        user_id: normalUserId,
        stripe_customer_id: 'cus_test_normal',
        default_payment_method_id: 'pm_test_normal'
      });

      // Create normal registration
      const { error } = await supabase
        .from('registrations')
        .insert({
          user_id: normalUserId,
          child_id: normalChildId,
          session_id: testSessionId,
          priority_opt_in: false,
          status: 'pending'
        });
      
      if (error) throw error;
      toast({ title: "Normal registration created", description: "priority_opt_in: false" });
    } catch (error: any) {
      toast({ title: "Error creating normal registration", description: error.message, variant: "destructive" });
    }
  };

  const toggleExactTiming = async () => {
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ open_time_exact: false })
        .eq('id', testSessionId);
      
      if (error) throw error;
      toast({ title: "Session updated", description: "open_time_exact set to false" });
    } catch (error: any) {
      toast({ title: "Error updating session", description: error.message, variant: "destructive" });
    }
  };

  const viewDevPage = () => {
    window.open(`/dev/run-prewarm?session_id=${testSessionId}`, '_blank');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Prewarm System Sanity Check</CardTitle>
          <CardDescription>
            Test session created with registration opening in 2 minutes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label>Test Session ID:</Label>
              <Input value={testSessionId} readOnly />
            </div>
            <div>
              <Label>Test User ID:</Label>
              <Input value={testUserId} onChange={(e) => setTestUserId(e.target.value)} />
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold">Step 1: Create Test Data</h3>
            <div className="flex gap-2">
              <Button onClick={createTestChild}>Create Test Child</Button>
              <Button onClick={createTestBillingProfile}>Create Billing Profile</Button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Step 2: Create Registrations</h3>
            <div className="flex gap-2">
              <Button onClick={createPriorityRegistration} variant="default">
                Create Priority Registration
              </Button>
              <Button onClick={createNormalRegistration} variant="outline">
                Create Normal Registration
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Step 3: Monitor Prewarm</h3>
            <Button onClick={viewDevPage} className="w-full">
              Open Dev Monitor Page (in new tab)
            </Button>
            <p className="text-sm text-muted-foreground">
              Watch for: Prewarm at T-60s → Tight loop at T-5s → Priority wins at T0
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Step 4: Test Polling Mode</h3>
            <Button onClick={toggleExactTiming} variant="secondary">
              Set open_time_exact = false
            </Button>
            <p className="text-sm text-muted-foreground">
              This will switch to aggressive polling mode instead of exact timing
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SanityCheck;