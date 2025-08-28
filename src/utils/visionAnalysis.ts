import { supabase } from '@/integrations/supabase/client';

/**
 * Analyze a page screenshot using GPT Vision models
 * @param screenshot - Base64 encoded image data (with or without data URL prefix)
 * @param sessionId - Session identifier for tracking
 * @param model - Optional model to use (defaults to gpt-5-2025-08-07)
 * @returns Vision analysis results
 */
export async function analyzePageWithVision(
  screenshot: string, 
  sessionId: string = 'default', 
  model: string = 'gpt-4o',
  isolationTest: boolean = false
) {
  // Validate model name and provide fallback
  const validModels = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'];
  if (!validModels.includes(model)) {
    console.warn(`Invalid model "${model}" requested, using "gpt-4o" instead`);
    model = 'gpt-4o';
  }
  
  console.log('🔍 Starting vision analysis for session:', sessionId, 'with model:', model, isolationTest ? '(isolation mode)' : '');
  console.log('📤 Calling test-vision-analysis function...');
  console.log('🔍 Request payload:', {
    sessionId,
    model,
    screenshotValid: !!screenshot && screenshot.startsWith('data:image'),
    screenshotLength: screenshot?.length,
    isolationTest
  });

  const { data, error } = await supabase.functions.invoke('test-vision-analysis', {
    body: {
      screenshot,
      sessionId,
      model,
      isolationTest
    }
  });

  console.log('📥 Raw Supabase response:', { data, error });

  if (error) {
    console.error('❌ Supabase function invoke error details:', {
      message: error.message,
      details: error['details'],
      hint: error['hint'],
      code: error['code'],
      fullError: error
    });
    throw new Error(`Vision analysis failed: ${error.message}`);
  }

  if (!data?.success) {
    throw new Error(`Vision analysis error: ${data?.error || 'Unknown error'}`);
  }

  // Return the analysis content directly, maintaining backward compatibility
  return data.analysis;
}

/**
 * Test the vision analysis with a simple mock screenshot
 */
export async function testVisionAnalysis(model: string = 'gpt-4o', isolationTest: boolean = false) {
  console.log(`🧪 Testing vision analysis with model: ${model} (isolation: ${isolationTest})`);
  
  try {
    // Generate a valid test screenshot (1x1 red pixel PNG)
    const testScreenshot = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    
    // Validate model name and provide fallback
    const validModels = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'];
    if (!validModels.includes(model)) {
      console.warn(`Invalid model "${model}" requested, using "gpt-4o" instead`);
      model = 'gpt-4o';
    }
    
    const result = await analyzePageWithVision(
      testScreenshot,
      'test-session',
      model,
      isolationTest
    );
    
    console.log('✅ Vision analysis test passed:', result);
    return result;
  } catch (error) {
    console.error('❌ Vision analysis test failed:', error);
    throw error;
  }
}

/**
 * Advanced vision analysis with intelligent model selection
 */
export async function analyzePageWithIntelligentModel(
  screenshot: string,
  sessionId: string,
  context?: {
    formComplexity?: number;
    urgency?: 'low' | 'normal' | 'high';
    costConstraint?: 'low' | 'medium' | 'high';
  }
) {
  console.log('🤖 Starting intelligent vision analysis...');

  try {
    // Step 1: Get optimal model recommendation
    const { data: selection, error: selectionError } = await supabase.functions.invoke('intelligent-model-selector', {
      body: {
        action: 'select_model',
        context: {
          taskType: 'vision_analysis',
          formComplexity: context?.formComplexity || 5,
          urgency: context?.urgency || 'normal',
          costConstraint: context?.costConstraint || 'medium'
        }
      }
    });

    if (selectionError) {
      console.warn('⚠️ Model selection failed, using default:', selectionError);
      // Fallback to regular vision analysis
      return await analyzePageWithVision(screenshot, sessionId);
    }

    const selectedModel = selection.selectedModel.id;
    console.log('🎯 Selected model:', selectedModel);

    // Step 2: Perform analysis with selected model
    const startTime = Date.now();
    const analysis = await analyzePageWithVision(screenshot, sessionId, selectedModel);
    const responseTime = Date.now() - startTime;

    // Step 3: Record outcome for learning
    const success = !!analysis;
    await supabase.functions.invoke('intelligent-model-selector', {
      body: {
        action: 'record_outcome',
        context: {
          modelId: selectedModel,
          taskType: 'vision_analysis',
          success,
          responseTime,
          signupSuccessful: success, // In real usage, this would be determined later
          metadata: {
            sessionId,
            formComplexity: context?.formComplexity,
            urgency: context?.urgency,
            costConstraint: context?.costConstraint
          }
        }
      }
    });

    console.log('📊 Model performance recorded for:', selectedModel);
    return analysis;

  } catch (error) {
    console.error('❌ Intelligent vision analysis failed:', error);
    throw error;
  }
}