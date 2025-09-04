import { supabase } from '@/integrations/supabase/client';

export async function testCredentials() {
  console.log('🧪 Testing system credentials...');
  
  try {
    const response = await supabase.functions.invoke('test-credentials', {
      body: {}
    });
    
    console.log('Credential test response:', response);
    
    if (response.error) {
      console.error('❌ Test failed:', response.error);
      return { success: false, error: response.error };
    }
    
    const results = response.data;
    console.log('📊 Test results:', results);
    
    return {
      success: results.overall,
      browserbase: results.browserbase,
      openai: results.openai
    };
    
  } catch (error) {
    console.error('❌ Credential test error:', error);
    return { success: false, error: error.message };
  }
}

export default testCredentials;