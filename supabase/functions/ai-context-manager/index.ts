import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AIContextRequest {
  action: 'update' | 'get' | 'extract_patterns' | 'get_patterns';
  contextId?: string;
  userId?: string;
  sessionId?: string;
  stage?: string;
  insights?: any;
  outcome?: string;
  patternType?: string;
}

interface AnonymizedInsights {
  [key: string]: any;
  // Remove all PII but keep valuable patterns
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, contextId, userId, sessionId, stage, insights, outcome, patternType }: AIContextRequest = await req.json();

    console.log(`[AI Context Manager] Processing ${action} request`, {
      contextId: contextId?.substring(0, 8),
      userId: userId?.substring(0, 8),
      sessionId: sessionId?.substring(0, 8),
      stage,
      outcome
    });

    switch (action) {
      case 'update':
        return await updateAIContext(supabase, contextId!, stage!, insights);
      
      case 'get':
        return await getAIContext(supabase, userId!, sessionId!);
      
      case 'extract_patterns':
        return await extractSuccessPatterns(supabase, contextId!, outcome!);
      
      case 'get_patterns':
        return await getSuccessPatterns(supabase, patternType);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Error in ai-context-manager:', error);
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

/**
 * Update AI context with new insights while protecting user data
 */
async function updateAIContext(supabase: any, contextId: string, stage: string, insights: any) {
  try {
    // Anonymize insights to protect user data while preserving learning value
    const anonymizedInsights = anonymizeUserData(insights);
    
    // Determine which field to update based on stage
    const updateField = getStageField(stage);
    const updateData = {
      journey_stage: stage,
      [updateField]: anonymizedInsights,
      updated_at: new Date().toISOString()
    };

    // If this is a completion stage, also update prediction accuracy
    if (stage === 'completion' && insights.actual_outcome) {
      updateData.actual_outcome = insights.actual_outcome;
      updateData.lessons_learned = extractLessons(anonymizedInsights);
    }

    // Update the context
    const { data: contextData, error: updateError } = await supabase
      .from('ai_signup_context')
      .update(updateData)
      .eq('id', contextId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update context: ${updateError.message}`);
    }

    // Extract patterns for our competitive moat (async - don't wait)
    if (stage === 'completion' && insights.actual_outcome === 'success') {
      extractSuccessPatterns(supabase, contextId, 'success').catch(err => 
        console.error('Pattern extraction failed:', err)
      );
    }

    console.log(`[Context Updated] Stage: ${stage}, Context: ${contextId.substring(0, 8)}`);

    return new Response(JSON.stringify({
      success: true,
      context: contextData,
      stage,
      patterns_extracted: stage === 'completion' && insights.actual_outcome === 'success'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('updateAIContext error:', error);
    throw error;
  }
}

/**
 * Retrieve full AI context for decision making
 */
async function getAIContext(supabase: any, userId: string, sessionId: string) {
  try {
    // Get the most recent context for this user/session
    const { data: context, error: contextError } = await supabase
      .from('ai_signup_context')
      .select('*')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (contextError) {
      throw new Error(`Failed to get context: ${contextError.message}`);
    }

    // Get relevant success patterns for this context
    const { data: patterns, error: patternsError } = await supabase
      .from('ai_success_patterns')
      .select('*')
      .gte('success_correlation', 0.7)
      .order('confidence_score', { ascending: false })
      .limit(10);

    if (patternsError) {
      console.warn('Failed to get patterns:', patternsError.message);
    }

    console.log(`[Context Retrieved] User: ${userId.substring(0, 8)}, Session: ${sessionId.substring(0, 8)}`);

    return new Response(JSON.stringify({
      success: true,
      context: context || null,
      relevant_patterns: patterns || [],
      insights: context ? generateInsights(context, patterns || []) : null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('getAIContext error:', error);
    throw error;
  }
}

/**
 * Extract success patterns for our competitive moat (no raw user data)
 */
async function extractSuccessPatterns(supabase: any, contextId: string, outcome: string) {
  try {
    // Get the completed context
    const { data: context, error: contextError } = await supabase
      .from('ai_signup_context')
      .select('*')
      .eq('id', contextId)
      .single();

    if (contextError || !context) {
      throw new Error(`Failed to get context: ${contextError?.message}`);
    }

    const patterns = [];

    // Extract provider patterns (anonymized)
    if (context.automation_intelligence?.provider_domain) {
      patterns.push({
        pattern_type: 'provider',
        pattern_features: {
          domain_category: categorizeDomain(context.automation_intelligence.provider_domain),
          form_complexity: context.automation_intelligence.form_analysis?.complexity || 0.5,
          captcha_frequency: context.automation_intelligence.captcha_detected ? 1.0 : 0.0,
          success_indicators: extractProviderIndicators(context)
        },
        success_correlation: outcome === 'success' ? 0.9 : 0.1,
        confidence_score: calculateConfidence(context)
      });
    }

    // Extract timing patterns
    if (context.prewarm_strategy?.optimal_timing) {
      patterns.push({
        pattern_type: 'timing',
        pattern_features: {
          hour_of_day: new Date(context.created_at).getHours(),
          day_of_week: new Date(context.created_at).getDay(),
          signup_duration_minutes: calculateSignupDuration(context),
          prewarm_effectiveness: context.prewarm_strategy.effectiveness_score || 0.5
        },
        success_correlation: outcome === 'success' ? 0.85 : 0.15,
        confidence_score: calculateConfidence(context)
      });
    }

    // Extract user behavior patterns (fully anonymized)
    patterns.push({
      pattern_type: 'user_behavior',
      pattern_features: {
        readiness_score: context.readiness_assessment?.score || 0.5,
        preparation_level: categorizePreparation(context.readiness_assessment),
        complexity_handled: context.requirements_analysis?.complexity || 'medium',
        success_prediction_accuracy: calculatePredictionAccuracy(context)
      },
      success_correlation: outcome === 'success' ? 0.8 : 0.2,
      confidence_score: calculateConfidence(context)
    });

    // Store patterns in our competitive moat database
    for (const pattern of patterns) {
      const { error: insertError } = await supabase
        .from('ai_success_patterns')
        .insert(pattern);

      if (insertError) {
        console.error('Failed to store pattern:', insertError.message);
      }
    }

    console.log(`[Patterns Extracted] Context: ${contextId.substring(0, 8)}, Outcome: ${outcome}, Patterns: ${patterns.length}`);

    return new Response(JSON.stringify({
      success: true,
      patterns_extracted: patterns.length,
      outcome,
      context_id: contextId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('extractSuccessPatterns error:', error);
    throw error;
  }
}

/**
 * Get success patterns for AI decision making
 */
async function getSuccessPatterns(supabase: any, patternType?: string) {
  try {
    let query = supabase
      .from('ai_success_patterns')
      .select('*')
      .gte('success_correlation', 0.6)
      .order('success_correlation', { ascending: false });

    if (patternType) {
      query = query.eq('pattern_type', patternType);
    }

    const { data: patterns, error } = await query.limit(20);

    if (error) {
      throw new Error(`Failed to get patterns: ${error.message}`);
    }

    return new Response(JSON.stringify({
      success: true,
      patterns: patterns || [],
      count: patterns?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('getSuccessPatterns error:', error);
    throw error;
  }
}

/**
 * Anonymize user data while preserving learning value
 */
function anonymizeUserData(insights: any): AnonymizedInsights {
  if (!insights) return {};

  const anonymized = { ...insights };

  // Remove or hash PII fields
  const piiFields = ['email', 'phone', 'name', 'address', 'child_name', 'parent_name', 'ssn'];
  
  for (const field of piiFields) {
    if (anonymized[field]) {
      delete anonymized[field];
    }
  }

  // Remove nested PII
  if (anonymized.form_data) {
    for (const key in anonymized.form_data) {
      if (piiFields.some(pii => key.toLowerCase().includes(pii))) {
        delete anonymized.form_data[key];
      }
    }
  }

  // Keep valuable patterns but anonymize
  if (anonymized.provider_url) {
    anonymized.provider_domain = new URL(anonymized.provider_url).hostname;
    delete anonymized.provider_url;
  }

  // Preserve timestamp patterns but remove exact times
  if (anonymized.timestamp) {
    const date = new Date(anonymized.timestamp);
    anonymized.hour_category = getHourCategory(date.getHours());
    anonymized.day_type = date.getDay() === 0 || date.getDay() === 6 ? 'weekend' : 'weekday';
    delete anonymized.timestamp;
  }

  return anonymized;
}

/**
 * Helper functions for pattern extraction
 */
function getStageField(stage: string): string {
  const stageFields = {
    'search': 'search_insights',
    'ready': 'readiness_assessment',
    'signup': 'requirements_analysis',
    'automation': 'automation_intelligence',
    'completion': 'lessons_learned'
  };
  return stageFields[stage] || 'search_insights';
}

function extractLessons(insights: any): any {
  return {
    success_factors: insights.success_factors || [],
    failure_points: insights.failure_points || [],
    optimization_opportunities: insights.optimization_opportunities || [],
    timing_insights: insights.timing_insights || {},
    provider_quirks: insights.provider_quirks || []
  };
}

function generateInsights(context: any, patterns: any[]): any {
  return {
    predicted_success_rate: context.predicted_success_rate || 0.5,
    recommended_strategy: determineStrategy(context, patterns),
    risk_factors: identifyRiskFactors(context, patterns),
    optimization_suggestions: generateOptimizations(context, patterns)
  };
}

function determineStrategy(context: any, patterns: any[]): string {
  const readinessScore = context.readiness_assessment?.score || 0.5;
  if (readinessScore > 0.8) return 'immediate_signup';
  if (readinessScore > 0.6) return 'assisted_signup';
  return 'guided_preparation';
}

function identifyRiskFactors(context: any, patterns: any[]): string[] {
  const risks = [];
  if (context.predicted_success_rate < 0.6) risks.push('low_success_prediction');
  if (context.automation_intelligence?.captcha_detected) risks.push('captcha_required');
  if (context.requirements_analysis?.complexity === 'high') risks.push('complex_form');
  return risks;
}

function generateOptimizations(context: any, patterns: any[]): string[] {
  const optimizations = [];
  
  // Find timing patterns
  const timingPatterns = patterns.filter(p => p.pattern_type === 'timing');
  if (timingPatterns.length > 0) {
    const bestTiming = timingPatterns[0];
    optimizations.push(`optimal_timing: ${bestTiming.pattern_features.hour_of_day}:00`);
  }

  // Find provider patterns
  const providerPatterns = patterns.filter(p => p.pattern_type === 'provider');
  if (providerPatterns.length > 0) {
    optimizations.push('use_proven_provider_approach');
  }

  return optimizations;
}

function categorizeDomain(domain: string): string {
  if (domain.includes('ymca')) return 'ymca';
  if (domain.includes('recreation')) return 'municipal';
  if (domain.includes('camp')) return 'private_camp';
  return 'other';
}

function extractProviderIndicators(context: any): any {
  return {
    form_complexity: context.automation_intelligence?.form_analysis?.complexity || 0.5,
    load_time: context.automation_intelligence?.performance?.load_time || 0,
    success_rate: context.automation_intelligence?.historical_success_rate || 0.5
  };
}

function calculateSignupDuration(context: any): number {
  const start = new Date(context.created_at);
  const end = new Date(context.updated_at);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60)); // minutes
}

function categorizePreparation(readiness: any): string {
  if (!readiness) return 'unknown';
  const score = readiness.score || 0;
  if (score > 0.8) return 'high';
  if (score > 0.5) return 'medium';
  return 'low';
}

function calculatePredictionAccuracy(context: any): number {
  if (!context.predicted_success_rate || !context.actual_outcome) return 0.5;
  
  const predicted = context.predicted_success_rate;
  const actual = context.actual_outcome === 'success' ? 1.0 : 0.0;
  return 1.0 - Math.abs(predicted - actual);
}

function calculateConfidence(context: any): number {
  let confidence = 0.5;
  
  // More data points = higher confidence
  const dataPoints = [
    context.search_insights,
    context.readiness_assessment,
    context.automation_intelligence,
    context.actual_outcome
  ].filter(Boolean).length;
  
  confidence += (dataPoints * 0.1);
  
  // Successful outcomes increase confidence
  if (context.actual_outcome === 'success') {
    confidence += 0.2;
  }
  
  return Math.min(0.95, confidence);
}

function getHourCategory(hour: number): string {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}
