import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role (full access)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const testResults: Array<{
      test: string;
      status: 'success' | 'error';
      message: string;
      data?: any;
    }> = [];

    const addResult = (test: string, status: 'success' | 'error', message: string, data?: any) => {
      testResults.push({ test, status, message, data });
      console.log(`[${status.toUpperCase()}] ${test}: ${message}`, data || '');
    };

    // Test 1: Create AI context for any user (Edge function privilege)
    const testUserId = crypto.randomUUID();
    const testSessionId = crypto.randomUUID();

    const { data: insertData, error: insertError } = await supabase
      .from('ai_signup_context')
      .insert({
        user_id: testUserId,
        session_id: testSessionId,
        journey_stage: 'search',
        search_insights: {
          query: 'test camp search',
          confidence: 0.82,
          provider_hints: ['ymca', 'recreation_center']
        },
        requirements_analysis: {
          complexity: 'medium',
          estimated_fields: 8,
          captcha_likelihood: 0.3
        },
        predicted_success_rate: 0.78
      })
      .select()
      .single();

    if (insertError) {
      addResult('Edge Function Insert', 'error', insertError.message);
    } else {
      addResult('Edge Function Insert', 'success', 'AI context created with service role access', insertData);
    }

    // Test 2: Update context across journey stages
    const journeyStages = ['ready', 'signup', 'automation', 'completion'];
    
    for (const stage of journeyStages) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for timestamp changes
      
      const updateData = {
        journey_stage: stage,
        ...(stage === 'ready' && {
          readiness_assessment: { score: 0.85, missing_fields: ['emergency_contact'] }
        }),
        ...(stage === 'automation' && {
          automation_intelligence: { 
            browser_session_id: crypto.randomUUID(),
            form_analysis: { complexity: 0.6, captcha_detected: false }
          }
        }),
        ...(stage === 'completion' && {
          actual_outcome: 'success',
          lessons_learned: { 
            optimal_timing: '09:00',
            provider_quirks: ['requires_phone_format_xxx_xxx_xxxx'] 
          }
        })
      };

      const { data: stageData, error: stageError } = await supabase
        .from('ai_signup_context')
        .update(updateData)
        .eq('session_id', testSessionId)
        .select()
        .single();

      if (stageError) {
        addResult(`Update Stage: ${stage}`, 'error', stageError.message);
      } else {
        addResult(`Update Stage: ${stage}`, 'success', `Journey updated to ${stage}`, stageData);
      }
    }

    // Test 3: Create and validate success patterns
    const testPatterns = [
      {
        pattern_type: 'provider',
        pattern_features: {
          domain_suffix: '.com',
          form_complexity: 0.6,
          captcha_frequency: 0.2,
          success_time_window: 'morning'
        },
        success_correlation: 0.88,
        confidence_score: 0.92
      },
      {
        pattern_type: 'timing',
        pattern_features: {
          day_of_week: 'tuesday',
          hour_range: '09:00-11:00',
          timezone_effect: 'minimal'
        },
        success_correlation: 0.75,
        confidence_score: 0.85
      },
      {
        pattern_type: 'user_behavior',
        pattern_features: {
          preparation_time: 'high',
          form_completion_speed: 'moderate',
          retry_pattern: 'none'
        },
        success_correlation: 0.82,
        confidence_score: 0.89
      }
    ];

    for (const pattern of testPatterns) {
      const { data: patternData, error: patternError } = await supabase
        .from('ai_success_patterns')
        .insert(pattern)
        .select()
        .single();

      if (patternError) {
        addResult(`Pattern: ${pattern.pattern_type}`, 'error', patternError.message);
      } else {
        addResult(`Pattern: ${pattern.pattern_type}`, 'success', 'Success pattern created', patternData);
      }
    }

    // Test 4: Query patterns by correlation (for AI learning)
    const { data: topPatterns, error: patternsError } = await supabase
      .from('ai_success_patterns')
      .select('*')
      .gte('success_correlation', 0.8)
      .order('success_correlation', { ascending: false })
      .limit(5);

    if (patternsError) {
      addResult('Query High-Value Patterns', 'error', patternsError.message);
    } else {
      addResult('Query High-Value Patterns', 'success', `Found ${topPatterns.length} high-correlation patterns`, topPatterns);
    }

    // Test 5: Cross-reference context with patterns (simulating AI learning)
    const { data: contextWithOutcome, error: contextError } = await supabase
      .from('ai_signup_context')
      .select('*')
      .eq('actual_outcome', 'success')
      .not('lessons_learned', 'is', null);

    if (contextError) {
      addResult('Learning Data Query', 'error', contextError.message);
    } else {
      addResult('Learning Data Query', 'success', `Found ${contextWithOutcome.length} completed signups with lessons`, contextWithOutcome);
    }

    // Test 6: Data anonymization validation (ensure no PII in patterns)
    const { data: allPatterns, error: allPatternsError } = await supabase
      .from('ai_success_patterns')
      .select('pattern_features');

    if (allPatternsError) {
      addResult('Data Privacy Check', 'error', allPatternsError.message);
    } else {
      // Check that pattern features don't contain obvious PII
      const piiFields = ['email', 'phone', 'name', 'address', 'ssn', 'child_name'];
      let piiFound = false;
      
      for (const pattern of allPatterns) {
        const featuresString = JSON.stringify(pattern.pattern_features).toLowerCase();
        for (const piiField of piiFields) {
          if (featuresString.includes(piiField)) {
            piiFound = true;
            break;
          }
        }
        if (piiFound) break;
      }

      addResult('Data Privacy Check', piiFound ? 'error' : 'success', 
        piiFound ? 'PII detected in patterns!' : 'No obvious PII found in patterns');
    }

    // Test 7: Performance test - bulk operations
    const bulkContexts = Array.from({ length: 10 }, (_, i) => ({
      user_id: crypto.randomUUID(),
      session_id: crypto.randomUUID(),
      journey_stage: 'search',
      search_insights: { batch_test: true, index: i },
      predicted_success_rate: 0.7 + (i * 0.02)
    }));

    const startTime = Date.now();
    const { data: bulkData, error: bulkError } = await supabase
      .from('ai_signup_context')
      .insert(bulkContexts)
      .select();

    const endTime = Date.now();

    if (bulkError) {
      addResult('Bulk Operations', 'error', bulkError.message);
    } else {
      addResult('Bulk Operations', 'success', 
        `Inserted ${bulkData.length} records in ${endTime - startTime}ms`, 
        { records: bulkData.length, duration_ms: endTime - startTime });
    }

    // Test 8: Cleanup test data (keep only the main test context for manual inspection)
    const { error: cleanupError } = await supabase
      .from('ai_signup_context')
      .delete()
      .neq('session_id', testSessionId);

    if (cleanupError) {
      addResult('Cleanup', 'error', cleanupError.message);
    } else {
      addResult('Cleanup', 'success', 'Test data cleaned up (kept main test context)');
    }

    const successCount = testResults.filter(r => r.status === 'success').length;
    const totalTests = testResults.length;

    return new Response(JSON.stringify({
      success: true,
      summary: {
        total_tests: totalTests,
        passed: successCount,
        failed: totalTests - successCount,
        success_rate: `${((successCount / totalTests) * 100).toFixed(1)}%`
      },
      test_session_id: testSessionId,
      results: testResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in test-ai-context function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
