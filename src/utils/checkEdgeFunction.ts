export async function checkEdgeFunction() {
  console.log('🔍 Checking edge function configuration...');
  
  // Simple test image (1x1 red pixel)
  const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
  
  try {
    const response = await fetch(
      'https://ezvwyfqtyanwnoyymhav.supabase.co/functions/v1/test-vision-analysis',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6dnd5ZnF0eWFud25veXltaGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NjY5MjQsImV4cCI6MjA3MDQ0MjkyNH0.FxQZcpBxYVmnUI-yyE15N7y-ai6ADPiQV9X8szQtIjI'
        },
        body: JSON.stringify({
          screenshot: testImage,
          model: 'gpt-4o',
          sessionId: 'debug-test'
        })
      }
    );
    
    const responseText = await response.text();
    console.log('Edge function raw response:', responseText);
    console.log('Response status:', response.status);
    
    try {
      const data = JSON.parse(responseText);
      
      if (data.error) {
        console.error('❌ Edge function error:', data);
        
        if (data.details?.includes('API key') || data.details?.includes('OPENAI_API_KEY')) {
          console.error('⚠️ CRITICAL: OpenAI API key not configured in Supabase!');
          console.error('To fix: Go to Supabase Dashboard → Edge Functions → Secrets → Add OPENAI_API_KEY');
          return {
            success: false,
            error: 'Missing OpenAI API Key',
            details: data.details,
            instructions: 'Set OPENAI_API_KEY in Supabase Edge Function Secrets'
          };
        }
      } else {
        console.log('✅ Edge function working:', data);
        return {
          success: true,
          data
        };
      }
    } catch (e) {
      console.error('Failed to parse response:', responseText);
      return {
        success: false,
        error: 'Invalid JSON response',
        rawResponse: responseText
      };
    }
    
  } catch (error) {
    console.error('❌ Failed to call edge function:', error);
    return {
      success: false,
      error: 'Network error',
      details: error.message
    };
  }
}