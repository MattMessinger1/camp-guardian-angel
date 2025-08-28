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
  sessionId: string, 
  model: string = 'gpt-4o',
  isolationTest: boolean = false
) {
  console.log(`🔍 Starting vision analysis for session: ${sessionId} with model: ${model}${isolationTest ? ' (isolation mode)' : ''}`);
  
  try {
    // Keep the complete screenshot data URL - don't remove the prefix
    console.log('📤 Calling test-vision-analysis function...');
    console.log('🔍 Request payload:', { 
      sessionId, 
      model, 
      screenshotValid: screenshot.startsWith('data:image'),
      screenshotLength: screenshot.length, 
      isolationTest 
    });
    
    const { data, error } = await supabase.functions.invoke('test-vision-analysis', {
      body: {
        screenshot: screenshot,  // Send complete data URL
        sessionId,
        model,
        isolationTest
      }
    });

    console.log('📥 Raw Supabase response:', { data, error });

    if (error) {
      console.error('❌ Supabase function invoke error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error
      });
      throw new Error(`Vision analysis failed: Edge Function returned a non-2xx status code`);
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
export async function testVisionAnalysis(model: string = 'gpt-4o', isolationTest: boolean = false) {
  console.log(`🧪 Testing Step 2.1: Vision Analysis with model: ${model} (isolation: ${isolationTest})`);
  
  // First run minimal test to check edge function basics
  console.log('🔧 Running minimal function test first...');
  
  try {
    const { data: minimalTest, error: minimalError } = await supabase.functions.invoke('test-minimal', { body: {} });
    
    if (minimalError) {
      console.error('❌ Minimal test failed:', minimalError);
      throw new Error(`Minimal test failed: ${minimalError.message}`);
    }
    
    console.log('✅ Minimal test passed:', minimalTest);
    
    // If basic test passes, proceed with vision analysis with proper data URL
    const testScreenshot = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAEsASwDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9U6KKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD/9k=';
    const testSessionId = 'test-session';
    
    console.log('🔍 Starting vision analysis for session:', testSessionId, 'with model:', model, isolationTest ? '(isolation mode)' : '');
    console.log('📤 Calling test-vision-analysis function...');
    console.log('🔍 Request payload:', {
      hasScreenshot: !!testScreenshot,
      screenshotFormat: testScreenshot.startsWith('data:image') ? 'data-url' : 'raw-base64',
      screenshotLength: testScreenshot.length,
      model
    });
    
    const analysis = await analyzePageWithVision(testScreenshot, testSessionId, model, isolationTest);
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