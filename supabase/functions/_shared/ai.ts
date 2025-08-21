import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Zod schemas for types
export const ParsedIntentSchema = z.object({
  campNames: z.array(z.string()).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  weekDateISO: z.string().optional(),
  age: z.number().optional(),
  timeOfDay: z.enum(['morning', 'afternoon', 'evening', 'full-day']).optional(),
  clarifyingQuestions: z.array(z.string()).max(2).optional(),
});

export type ParsedIntent = z.infer<typeof ParsedIntentSchema>;

/**
 * Generate embeddings using OpenAI text-embedding-3-small
 */
export async function embedText(text: string): Promise<number[]> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  if (!text || text.trim().length === 0) {
    throw new Error('Text input is required for embedding');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.trim(),
        encoding_format: 'float',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.data || !data.data[0] || !data.data[0].embedding) {
      throw new Error('Invalid response format from OpenAI embeddings API');
    }

    return data.data[0].embedding as number[];
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Parse user query to extract camp search intent
 */
export async function chatParse(query: string): Promise<ParsedIntent> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  if (!query || query.trim().length === 0) {
    throw new Error('Query is required for parsing');
  }

  const systemPrompt = `Extract camp search info from user queries (US context). Return JSON with:
- campNames: array of camp names mentioned
- city, state, zip: location details if mentioned
- weekDateISO: date in YYYY-MM-DD format if mentioned
- age: child's age if mentioned
- timeOfDay: 'morning'|'afternoon'|'evening'|'full-day' if mentioned
- clarifyingQuestions: max 2 essential questions only if critically needed

Examples:
"soccer camps in Austin" → {"campNames":[], "city":"Austin", "state":"Texas"}
"Camp Wildwood next week" → {"campNames":["Camp Wildwood"], "weekDateISO":"2024-08-19"}
"summer camp for 8 year old" → {"age":8}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query.trim() }
        ],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message?.content) {
      throw new Error('Invalid response format from OpenAI chat API');
    }

    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);
    
    // Validate with Zod schema
    const result = ParsedIntentSchema.parse(parsed);
    
    return result;
  } catch (error) {
    console.error('Error parsing query:', error);
    throw error;
  }
}