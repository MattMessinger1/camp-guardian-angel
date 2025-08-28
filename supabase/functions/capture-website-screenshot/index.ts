import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, sessionId } = await req.json();
    
    console.log(`📸 Capturing screenshot for URL: ${url}`);
    
    if (!url) {
      return new Response(
        JSON.stringify({ 
          error: 'URL is required',
          details: 'Please provide a valid URL to capture'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // For testing purposes in Lovable environment, we'll simulate screenshot capture
    // In production, you would use a headless browser service like:
    // - Browserbase (already integrated)
    // - Puppeteer/Playwright
    // - Screenshot API service
    
    console.log(`🎯 Simulating screenshot capture for ${url} (session: ${sessionId})`);
    
    // Simulate a realistic delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create a simulated screenshot based on URL
    let simulatedScreenshot = '';
    
    if (url.includes('ymca')) {
      // Simulate YMCA registration form
      simulatedScreenshot = await generateSimulatedFormScreenshot('YMCA Registration Form', [
        'Child Information',
        'Parent/Guardian Details', 
        'Emergency Contact',
        'Medical Information',
        'Program Selection',
        'Submit Registration'
      ]);
    } else if (url.includes('community') || url.includes('recreation')) {
      // Simulate community center form
      simulatedScreenshot = await generateSimulatedFormScreenshot('Community Center Registration', [
        'Participant Details',
        'Contact Information',
        'Program Preferences',
        'Payment Method',
        'Terms & Conditions',
        'Complete Registration'
      ]);
    } else {
      // Generic camp registration form
      simulatedScreenshot = await generateSimulatedFormScreenshot('Camp Registration', [
        'Camper Information',
        'Parent Contact',
        'Session Selection',
        'Special Needs',
        'Photo Permission',
        'Register Now'
      ]);
    }
    
    console.log(`✅ Screenshot captured successfully for ${url}`);
    
    return new Response(
      JSON.stringify({
        success: true,
        screenshot: simulatedScreenshot,
        url,
        sessionId,
        timestamp: new Date().toISOString(),
        simulated: true,
        note: 'This is a simulated screenshot for testing purposes'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Screenshot capture error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Screenshot capture failed',
        message: error.message,
        details: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function generateSimulatedFormScreenshot(title: string, fields: string[]): Promise<string> {
  // Create a simple HTML form and convert to base64 image
  const htmlContent = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
          .form-container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 600px; }
          h1 { color: #2c3e50; margin-bottom: 30px; }
          .field { margin-bottom: 20px; }
          label { display: block; margin-bottom: 5px; font-weight: bold; color: #34495e; }
          input, select { width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 4px; }
          button { background: #3498db; color: white; padding: 15px 30px; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; }
          .captcha { background: #f8f9fa; padding: 15px; border: 2px dashed #dee2e6; margin: 20px 0; text-align: center; }
        </style>
      </head>
      <body>
        <div class="form-container">
          <h1>${title}</h1>
          ${fields.map(field => `
            <div class="field">
              <label>${field}</label>
              <input type="text" placeholder="Enter ${field.toLowerCase()}" />
            </div>
          `).join('')}
          <div class="captcha">
            <strong>CAPTCHA Verification Required</strong><br>
            <small>Please verify you are human</small>
          </div>
          <button type="submit">${fields[fields.length - 1]}</button>
        </div>
      </body>
    </html>
  `;
  
  // Convert HTML to base64 (simulated)
  const base64Html = btoa(unescape(encodeURIComponent(htmlContent)));
  
  // Return as a data URL - in real implementation, this would be a real screenshot
  return `data:text/html;base64,${base64Html}`;
}