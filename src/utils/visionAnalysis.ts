import { supabase } from '@/integrations/supabase/client';

/**
 * Analyze a page screenshot using GPT-4 Vision
 * @param screenshot - Base64 encoded image data (with or without data URL prefix)
 * @param sessionId - Session identifier for tracking
 * @param model - Optional model to use (defaults to gpt-4o)
 * @returns Vision analysis results
 */
export async function analyzePageWithVision(
  screenshot: string, 
  sessionId: string, 
  model: string = 'gpt-4o'
) {
  console.log('🔍 Starting vision analysis for session:', sessionId, 'with model:', model);
  
  try {
    // Clean the screenshot data - remove data URL prefix if present
    let cleanScreenshot = screenshot;
    if (screenshot.includes(',')) {
      cleanScreenshot = screenshot.split(',')[1];
    }

    console.log('📤 Calling test-vision-analysis function...');
    const { data, error } = await supabase.functions.invoke('test-vision-analysis', {
      body: {
        screenshot: cleanScreenshot,
        sessionId,
        model
      }
    });

    if (error) {
      console.error('❌ Supabase function invoke error:', error);
      throw new Error(`Vision analysis failed: ${error.message}`);
    }

    if (!data) {
      console.error('❌ No data returned from function');
      throw new Error('No data returned from vision analysis function');
    }

    if (!data.success) {
      console.error('❌ Vision analysis returned failure:', data.error || data);
      throw new Error(`Vision analysis error: ${data.error || 'Unknown error'}`);
    }

    console.log('✅ Vision analysis completed:', {
      complexity: data.analysis?.formComplexity,
      captchaRisk: data.analysis?.captchaRisk,
      model: data.metadata?.model
    });

    return data.analysis;

  } catch (error) {
    console.error('❌ Vision analysis function error:', error);
    throw error;
  }
}

/**
 * Test the vision analysis with a simple mock screenshot
 */
export async function testVisionAnalysis() {
  console.log('🧪 Testing Step 2.1: Vision Analysis');
  
  // Create a simple test screenshot (1x1 transparent PNG)
  const testScreenshot = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  
  try {
    const analysis = await analyzePageWithVision(testScreenshot, 'test-session');
    console.log('✅ Vision analysis test passed:', analysis);
    return analysis;
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