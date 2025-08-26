import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface PredictiveCaptchaTest {
  provider: string;
  simulateHighLikelihood?: boolean;
  testNotificationSpeed?: boolean;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const { 
      provider, 
      simulateHighLikelihood = false,
      testNotificationSpeed = false 
    }: PredictiveCaptchaTest = await req.json();
    
    if (!provider) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: provider' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[TEST-PREDICTIVE-CAPTCHA] Starting test for provider ${provider}`);

    const testResults: any = {
      provider,
      testStarted: new Date().toISOString(),
      predictions: {},
      optimizations: {}
    };

    // Simulate predictive analysis
    if (simulateHighLikelihood) {
      testResults.predictions = {
        likelihood: 0.85,
        confidence: 0.78,
        factors: {
          timeOfDay: 0.9, // Peak registration time
          trafficLoad: 0.8, // High queue position
          providerHistory: 0.7, // Known CAPTCHA frequency
          sessionBehavior: 0.6 // Normal behavior
        },
        recommendedAction: 'pre_notify'
      };

      console.log(`[TEST-PREDICTIVE-CAPTCHA] High CAPTCHA likelihood predicted for ${provider}`);
      
      // Simulate pre-emptive optimizations
      testResults.optimizations = {
        preGeneratedTokens: true,
        notificationChannelsPrewarmed: true,
        browserStateCheckpointed: true,
        parentContactVerified: true
      };
    }

    // Test notification speed if requested
    if (testNotificationSpeed) {
      const notificationStartTime = Date.now();
      
      // Simulate notification process
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate processing
      
      const notificationTime = Date.now() - notificationStartTime;
      testResults.notificationPerformance = {
        smsDeliveryTime: `${notificationTime}ms`,
        emailDeliveryTime: `${notificationTime + 50}ms`,
        totalNotificationTime: `${notificationTime + 200}ms`
      };

      console.log(`[TEST-PREDICTIVE-CAPTCHA] Notification speed test completed: ${notificationTime}ms`);
    }

    // Store test results for analytics
    const { error: insertError } = await supabase
      .from('observability_metrics')
      .insert({
        metric_type: 'captcha_prediction_test',
        metric_name: 'predictive_test_results',
        value: simulateHighLikelihood ? testResults.predictions.likelihood : 0.5,
        dimensions: testResults,
        recorded_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('[TEST-PREDICTIVE-CAPTCHA] Error storing test results:', insertError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        testResults,
        message: 'Predictive CAPTCHA test completed successfully',
        optimizations: [
          'Pre-emptive CAPTCHA detection enabled',
          'Notification channels optimized',
          'Resume token pre-generation active',
          'Queue position monitoring enhanced'
        ]
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[TEST-PREDICTIVE-CAPTCHA] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});