import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ModelCapabilities {
  vision: boolean;
  reasoning: boolean;
  speed: 'fast' | 'medium' | 'slow';
  cost: 'low' | 'medium' | 'high';
  accuracy: 'basic' | 'good' | 'excellent';
  formComplexity: 'simple' | 'complex' | 'any';
}

interface ModelConfig {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic';
  capabilities: ModelCapabilities;
  apiParams: {
    maxTokensParam: string;
    supportsTemperature: boolean;
    supportsJsonMode: boolean;
  };
}

const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: 'gpt-5-2025-08-07',
    name: 'GPT-5',
    provider: 'openai',
    capabilities: {
      vision: true,
      reasoning: true,
      speed: 'medium',
      cost: 'high',
      accuracy: 'excellent',
      formComplexity: 'any'
    },
    apiParams: {
      maxTokensParam: 'max_completion_tokens',
      supportsTemperature: false,
      supportsJsonMode: true
    }
  },
  {
    id: 'o4-mini-2025-04-16',
    name: 'O4 Mini',
    provider: 'openai',
    capabilities: {
      vision: true,
      reasoning: true,
      speed: 'fast',
      cost: 'medium',
      accuracy: 'good',
      formComplexity: 'complex'
    },
    apiParams: {
      maxTokensParam: 'max_completion_tokens',
      supportsTemperature: false,
      supportsJsonMode: true
    }
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o Legacy',
    provider: 'openai',
    capabilities: {
      vision: true,
      reasoning: false,
      speed: 'fast',
      cost: 'low',
      accuracy: 'good',
      formComplexity: 'simple'
    },
    apiParams: {
      maxTokensParam: 'max_tokens',
      supportsTemperature: true,
      supportsJsonMode: true
    }
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    capabilities: {
      vision: true,
      reasoning: false,
      speed: 'fast',
      cost: 'low',
      accuracy: 'basic',
      formComplexity: 'simple'
    },
    apiParams: {
      maxTokensParam: 'max_tokens',
      supportsTemperature: true,
      supportsJsonMode: true
    }
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, context } = await req.json();

    switch (action) {
      case 'select_model':
        return await selectOptimalModel(supabase, context);
      case 'record_outcome':
        return await recordModelOutcome(supabase, context);
      case 'get_performance':
        return await getModelPerformance(supabase, context);
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('❌ Model selector error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function selectOptimalModel(supabase: any, context: any) {
  console.log('🤖 Selecting optimal model for context:', context);
  
  const {
    taskType = 'vision_analysis',
    formComplexity = 5,
    campProvider = 'unknown',
    urgency = 'normal',
    costConstraint = 'medium'
  } = context;

  // Get recent performance data for this scenario
  const { data: performanceData } = await supabase
    .from('ai_model_performance')
    .select('*')
    .eq('task_type', taskType)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
    .order('success_rate', { ascending: false });

  // Calculate model scores based on context and performance
  const modelScores = AVAILABLE_MODELS.map(model => {
    const performance = performanceData?.find(p => p.model_id === model.id) || {
      success_rate: 0.5, // Default for new models
      avg_response_time: 2000,
      total_attempts: 0
    };

    let score = 0;

    // Base capability score
    if (formComplexity > 7 && model.capabilities.reasoning) score += 30;
    if (formComplexity <= 5 && model.capabilities.speed === 'fast') score += 20;
    if (model.capabilities.vision) score += 10;

    // Performance history score (60% of total)
    score += performance.success_rate * 60;

    // Speed bonus for urgent tasks
    if (urgency === 'high' && model.capabilities.speed === 'fast') score += 15;

    // Cost efficiency
    if (costConstraint === 'low' && model.capabilities.cost === 'low') score += 10;
    if (costConstraint === 'high' && model.capabilities.accuracy === 'excellent') score += 15;

    // Provider diversity bonus (try different models)
    if (performance.total_attempts === 0) score += 5; // Exploration bonus

    return {
      model,
      score,
      performance,
      reasoning: {
        formComplexity: formComplexity > 7 ? 'complex' : 'simple',
        needsReasoning: formComplexity > 7,
        urgency,
        costConstraint
      }
    };
  });

  // Sort by score and select top model
  modelScores.sort((a, b) => b.score - a.score);
  const selectedModel = modelScores[0];

  console.log('✅ Model selected:', {
    model: selectedModel.model.name,
    score: selectedModel.score,
    reasoning: selectedModel.reasoning
  });

  // Record the selection for learning
  await supabase.from('ai_model_selections').insert({
    model_id: selectedModel.model.id,
    task_type: taskType,
    context: context,
    selection_reason: selectedModel.reasoning,
    score: selectedModel.score
  });

  return new Response(JSON.stringify({
    success: true,
    selectedModel: selectedModel.model,
    reasoning: selectedModel.reasoning,
    alternativeModels: modelScores.slice(1, 3).map(s => ({
      model: s.model.name,
      score: s.score
    }))
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function recordModelOutcome(supabase: any, context: any) {
  const {
    modelId,
    taskType,
    success,
    responseTime,
    errorMessage,
    signupSuccessful,
    metadata
  } = context;

  console.log('📊 Recording model outcome:', { modelId, success, signupSuccessful });

  // Update model performance metrics
  const { data: existing } = await supabase
    .from('ai_model_performance')
    .select('*')
    .eq('model_id', modelId)
    .eq('task_type', taskType)
    .single();

  if (existing) {
    // Update existing performance record
    const totalAttempts = existing.total_attempts + 1;
    const totalSuccesses = existing.total_successes + (success ? 1 : 0);
    const totalSignupSuccesses = existing.total_signup_successes + (signupSuccessful ? 1 : 0);
    
    await supabase
      .from('ai_model_performance')
      .update({
        total_attempts: totalAttempts,
        total_successes: totalSuccesses,
        total_signup_successes: totalSignupSuccesses,
        success_rate: totalSuccesses / totalAttempts,
        signup_success_rate: totalSignupSuccesses / totalAttempts,
        avg_response_time: (existing.avg_response_time * existing.total_attempts + responseTime) / totalAttempts,
        last_used_at: new Date().toISOString(),
        error_rate: (totalAttempts - totalSuccesses) / totalAttempts
      })
      .eq('id', existing.id);
  } else {
    // Create new performance record
    await supabase.from('ai_model_performance').insert({
      model_id: modelId,
      task_type: taskType,
      total_attempts: 1,
      total_successes: success ? 1 : 0,
      total_signup_successes: signupSuccessful ? 1 : 0,
      success_rate: success ? 1.0 : 0.0,
      signup_success_rate: signupSuccessful ? 1.0 : 0.0,
      avg_response_time: responseTime,
      error_rate: success ? 0.0 : 1.0,
      last_used_at: new Date().toISOString()
    });
  }

  // Record detailed outcome for analysis
  await supabase.from('ai_model_outcomes').insert({
    model_id: modelId,
    task_type: taskType,
    success: success,
    signup_successful: signupSuccessful,
    response_time: responseTime,
    error_message: errorMessage,
    metadata: metadata
  });

  return new Response(JSON.stringify({
    success: true,
    message: 'Outcome recorded successfully'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function getModelPerformance(supabase: any, context: any) {
  const { taskType, timeRange = '7d' } = context;
  
  const daysBack = timeRange === '1d' ? 1 : timeRange === '7d' ? 7 : 30;
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

  const { data: performance } = await supabase
    .from('ai_model_performance')
    .select('*')
    .eq('task_type', taskType)
    .gte('last_used_at', since)
    .order('signup_success_rate', { ascending: false });

  return new Response(JSON.stringify({
    success: true,
    performance: performance || [],
    timeRange,
    availableModels: AVAILABLE_MODELS.length
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}