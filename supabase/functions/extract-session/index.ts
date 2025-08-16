import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { 
  SessionCandidateSchema, 
  OPENAI_FUNCTION_SCHEMA, 
  calculateConfidence,
  type SessionCandidate,
  type ConfidenceScore 
} from '../_shared/sessionSchema.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize clients
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface ExtractionResult {
  success: boolean;
  data: SessionCandidate | null;
  confidence: ConfidenceScore;
  errors: string[];
  fallbackUsed: boolean;
  retryCount: number;
}

async function callOpenAI(
  htmlContent: string, 
  sourceUrl: string, 
  retryPrompt?: string
): Promise<{ data: any; confidence: number }> {
  const systemPrompt = retryPrompt || `You are a precise data extractor for camp/activity sessions. Extract structured data from HTML content.

CRITICAL REQUIREMENTS:
- name: Extract the actual session/camp/activity name (not just "Summer Camp")
- source_url: Use the provided URL exactly
- city, state: Extract actual location (required)
- All optional fields should be extracted if clearly present
- Use ISO datetime format for dates (YYYY-MM-DDTHH:mm:ss.sssZ)
- Use lowercase for days_of_week
- Be conservative with data - only extract what you're confident about
- If information is unclear or missing, use null for optional fields

Extract only factual information from the content. Do not make assumptions.`;

  const userPrompt = `Extract session data from this HTML content.
Source URL: ${sourceUrl}

HTML Content:
${htmlContent.slice(0, 8000)}`; // Limit content to avoid token limits

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        temperature: 0.1, // Very low temperature for consistency
        max_completion_tokens: 1000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          function: OPENAI_FUNCTION_SCHEMA
        }],
        tool_choice: { type: 'function', function: { name: 'extract_session_data' } }
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall || toolCall.function.name !== 'extract_session_data') {
      throw new Error('No valid function call in response');
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    
    // Calculate model confidence based on response
    const confidence = result.choices?.[0]?.finish_reason === 'tool_calls' ? 0.9 : 0.7;
    
    return { data: extractedData, confidence };
  } catch (error) {
    console.error('OpenAI extraction error:', error);
    throw error;
  }
}

function createRetryPrompt(validationErrors: string[]): string {
  return `You previously failed to extract valid session data. Errors found:
${validationErrors.join('\n')}

CRITICAL: Fix these specific issues and output ONLY valid JSON that matches the required schema.
- Ensure all required fields (name, source_url, city, state) are present and valid
- Use proper data types (numbers for prices/ages, ISO datetime strings for dates)
- Check that URLs are properly formatted
- Verify that dates, prices, and ages are in valid ranges

Extract the data again, being extra careful about the validation errors above.`;
}

function fallbackExtraction(htmlContent: string, sourceUrl: string): Partial<SessionCandidate> {
  const fallbackData: Partial<SessionCandidate> = {
    source_url: sourceUrl
  };

  // Simple regex-based extraction as fallback
  const text = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  
  // Try to extract name from title tags or headers
  const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)</i);
  const h1Match = htmlContent.match(/<h1[^>]*>([^<]+)</i);
  const h2Match = htmlContent.match(/<h2[^>]*>([^<]+)</i);
  
  if (titleMatch?.[1]) {
    fallbackData.name = titleMatch[1].trim();
  } else if (h1Match?.[1]) {
    fallbackData.name = h1Match[1].trim();
  } else if (h2Match?.[1]) {
    fallbackData.name = h2Match[1].trim();
  }

  // Try to extract location
  const locationRegex = /([A-Za-z\s]+),\s*([A-Z]{2}|[A-Za-z]+)/g;
  const locationMatch = locationRegex.exec(text);
  if (locationMatch) {
    fallbackData.city = locationMatch[1].trim();
    fallbackData.state = locationMatch[2].trim();
  }

  // Try to extract prices
  const priceRegex = /\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g;
  const priceMatches = Array.from(text.matchAll(priceRegex));
  if (priceMatches.length > 0) {
    const prices = priceMatches.map(m => parseFloat(m[1].replace(',', '')));
    fallbackData.price_min = Math.min(...prices);
    if (prices.length > 1) {
      fallbackData.price_max = Math.max(...prices);
    }
  }

  // Try to extract ages
  const ageRegex = /(?:age[s]?\s*|for\s+)(\d+)(?:\s*[-–to]\s*(\d+))?/gi;
  const ageMatch = ageRegex.exec(text);
  if (ageMatch) {
    fallbackData.age_min = parseInt(ageMatch[1]);
    if (ageMatch[2]) {
      fallbackData.age_max = parseInt(ageMatch[2]);
    }
  }

  return fallbackData;
}

async function extractSessionData(
  htmlContent: string, 
  sourceUrl: string
): Promise<ExtractionResult> {
  const errors: string[] = [];
  let retryCount = 0;
  let fallbackUsed = false;
  let extractedData: any = null;
  let modelConfidence = 0;

  // First attempt with OpenAI
  try {
    console.log('Attempting primary extraction with OpenAI...');
    const result = await callOpenAI(htmlContent, sourceUrl);
    extractedData = result.data;
    modelConfidence = result.confidence;

    // Validate with Zod schema
    const validation = SessionCandidateSchema.safeParse(extractedData);
    if (validation.success) {
      console.log('Primary extraction successful');
      const confidence = calculateConfidence(modelConfidence, true, false, 0);
      return {
        success: true,
        data: validation.data,
        confidence,
        errors: [],
        fallbackUsed: false,
        retryCount: 0
      };
    } else {
      console.log('Primary extraction failed validation:', validation.error.issues);
      errors.push(...validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`));
    }
  } catch (error) {
    console.error('Primary extraction failed:', error);
    errors.push(`OpenAI extraction error: ${error.message}`);
  }

  // Retry with error-aware prompt if we have validation errors
  if (errors.length > 0 && retryCount === 0) {
    try {
      console.log('Attempting retry with error-aware prompt...');
      retryCount = 1;
      const retryPrompt = createRetryPrompt(errors);
      const result = await callOpenAI(htmlContent, sourceUrl, retryPrompt);
      extractedData = result.data;
      modelConfidence = result.confidence;

      // Validate retry attempt
      const validation = SessionCandidateSchema.safeParse(extractedData);
      if (validation.success) {
        console.log('Retry extraction successful');
        const confidence = calculateConfidence(modelConfidence, true, false, 1);
        return {
          success: true,
          data: validation.data,
          confidence,
          errors: [],
          fallbackUsed: false,
          retryCount: 1
        };
      } else {
        console.log('Retry extraction failed validation:', validation.error.issues);
        errors.push(...validation.error.issues.map(i => `Retry ${i.path.join('.')}: ${i.message}`));
      }
    } catch (error) {
      console.error('Retry extraction failed:', error);
      errors.push(`Retry OpenAI extraction error: ${error.message}`);
    }
  }

  // Fallback to rule-based extraction
  console.log('Attempting fallback extraction...');
  fallbackUsed = true;
  const fallbackData = fallbackExtraction(htmlContent, sourceUrl);
  
  // Check if fallback has minimum required fields
  if (fallbackData.name && fallbackData.source_url && fallbackData.city && fallbackData.state) {
    const validation = SessionCandidateSchema.safeParse(fallbackData);
    if (validation.success) {
      console.log('Fallback extraction successful');
      const confidence = calculateConfidence(0.5, true, true, retryCount);
      return {
        success: true,
        data: validation.data,
        confidence,
        errors: errors,
        fallbackUsed: true,
        retryCount
      };
    } else {
      errors.push(...validation.error.issues.map(i => `Fallback ${i.path.join('.')}: ${i.message}`));
    }
  } else {
    errors.push('Fallback extraction missing required fields');
  }

  // All extraction methods failed
  console.log('All extraction methods failed');
  const confidence = calculateConfidence(modelConfidence, false, fallbackUsed, retryCount);
  return {
    success: false,
    data: null,
    confidence,
    errors,
    fallbackUsed,
    retryCount
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { html_content, source_url, source_id } = await req.json();

    if (!html_content || !source_url) {
      return new Response(
        JSON.stringify({ error: 'html_content and source_url are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Extracting session data from: ${source_url}`);
    const result = await extractSessionData(html_content, source_url);

    if (result.success && result.data) {
      // Store in session_candidates table
      const candidateData = {
        source_id: source_id || null,
        url: source_url,
        extracted_json: result.data,
        confidence: result.confidence.overall,
        status: 'extracted',
        notes: result.fallbackUsed ? 'Used fallback extraction' : null
      };

      const { data: inserted, error: insertError } = await supabase
        .from('session_candidates')
        .insert(candidateData)
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting candidate:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to store extraction result' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Successfully extracted and stored candidate: ${inserted.id}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          candidate_id: inserted.id,
          data: result.data,
          confidence: result.confidence,
          fallback_used: result.fallbackUsed,
          retry_count: result.retryCount
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Log failed extraction but don't store invalid data
      console.error('Extraction failed:', result.errors);
      return new Response(
        JSON.stringify({ 
          success: false, 
          errors: result.errors,
          confidence: result.confidence 
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Session extraction error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});