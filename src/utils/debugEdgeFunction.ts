import { supabase } from '@/integrations/supabase/client';

export async function debugEdgeFunction() {
  console.log('🔍 Testing edge function directly...');
  
  // Minimal valid PNG image (1x1 red pixel)
  const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
  
  try {
    const response = await supabase.functions.invoke('test-vision-analysis', {
      body: {
        screenshot: testImage,
        model: 'gpt-4o',
        sessionId: 'debug-test'
      }
    });
    
    console.log('Edge function response:', response);
    
    if (response.error) {
      console.error('❌ Edge function error:', response.error);
      
      // Check if it's an API key issue
      if (response.error.message?.includes('API key')) {
        console.error('⚠️ OpenAI API key not configured in Supabase. Please set OPENAI_API_KEY in Edge Function secrets.');
      }
      
      return false;
    }
    
    console.log('✅ Edge function working:', response.data);
    return true;
    
  } catch (error) {
    console.error('❌ Edge function test failed:', error);
    return false;
  }
}

export default debugEdgeFunction;