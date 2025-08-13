import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Zod schemas
export const EmbeddingKindSchema = z.enum(['camp', 'location', 'session']);
export type EmbeddingKind = z.infer<typeof EmbeddingKindSchema>;

export const SearchResultSchema = z.object({
  id: z.string(),
  kind: EmbeddingKindSchema,
  ref_id: z.string(),
  text: z.string(),
  similarity: z.number(),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

export const SearchOptionsSchema = z.object({
  limit: z.number().min(1).max(100).default(10),
  kind: EmbeddingKindSchema.optional(),
  threshold: z.number().min(0).max(1).default(0.7),
});

export type SearchOptions = z.infer<typeof SearchOptionsSchema>;

// Initialize Supabase client
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Upsert an embedding into the search_embeddings table
 */
export async function upsertEmbedding(
  kind: EmbeddingKind,
  refId: string,
  text: string,
  embedding: number[]
): Promise<void> {
  // Validate inputs
  EmbeddingKindSchema.parse(kind);
  
  if (!refId || !text || !embedding || embedding.length !== 1536) {
    throw new Error('Invalid parameters: refId, text are required and embedding must be 1536 dimensions');
  }

  const supabase = getSupabaseClient();

  try {
    // First, try to find existing embedding
    const { data: existing, error: findError } = await supabase
      .from('search_embeddings')
      .select('id')
      .eq('kind', kind)
      .eq('ref_id', refId)
      .single();

    if (findError && findError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw findError;
    }

    const embeddingData = {
      kind,
      ref_id: refId,
      text: text.trim(),
      embedding: `[${embedding.join(',')}]`, // Format as PostgreSQL array
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      // Update existing embedding
      const { error: updateError } = await supabase
        .from('search_embeddings')
        .update(embeddingData)
        .eq('id', existing.id);

      if (updateError) {
        throw updateError;
      }

      console.log(`Updated embedding for ${kind}:${refId}`);
    } else {
      // Insert new embedding
      const { error: insertError } = await supabase
        .from('search_embeddings')
        .insert(embeddingData);

      if (insertError) {
        throw insertError;
      }

      console.log(`Inserted new embedding for ${kind}:${refId}`);
    }
  } catch (error) {
    console.error('Error upserting embedding:', error);
    throw error;
  }
}

/**
 * Search embeddings by cosine similarity
 */
export async function searchByEmbedding(
  queryEmbedding: number[],
  options: Partial<SearchOptions> = {}
): Promise<SearchResult[]> {
  // Validate and set defaults
  const opts = SearchOptionsSchema.parse(options);
  
  if (!queryEmbedding || queryEmbedding.length !== 1536) {
    throw new Error('Query embedding must be 1536 dimensions');
  }

  const supabase = getSupabaseClient();

  try {
    // Build the query
    let query = supabase.rpc('match_embeddings', {
      query_embedding: `[${queryEmbedding.join(',')}]`,
      match_threshold: opts.threshold,
      match_count: opts.limit,
    });

    // Add kind filter if specified
    if (opts.kind) {
      query = query.eq('kind', opts.kind);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    if (!data) {
      return [];
    }

    // Validate and transform results
    const results: SearchResult[] = data.map((row: any) => {
      return SearchResultSchema.parse({
        id: row.id,
        kind: row.kind,
        ref_id: row.ref_id,
        text: row.text,
        similarity: row.similarity || 0,
      });
    });

    return results;
  } catch (error) {
    console.error('Error searching embeddings:', error);
    throw error;
  }
}

/**
 * Simple rate limiting check using Supabase
 * Allows 20 calls per hour per user
 */
export async function checkRateLimit(userId: string, action: string = 'search'): Promise<boolean> {
  if (!userId) {
    throw new Error('User ID is required for rate limiting');
  }

  const supabase = getSupabaseClient();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const maxCalls = 20;

  try {
    // Count recent calls for this user
    const { count, error } = await supabase
      .from('search_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('action', action)
      .gte('created_at', oneHourAgo);

    if (error) {
      console.error('Rate limit check error:', error);
      return true; // Allow on error to avoid blocking users
    }

    const currentCalls = count || 0;
    
    if (currentCalls >= maxCalls) {
      console.log(`Rate limit exceeded for user ${userId}: ${currentCalls}/${maxCalls} calls in last hour`);
      return false;
    }

    // Log this call
    await supabase
      .from('search_events')
      .insert({
        user_id: userId,
        action,
        created_at: new Date().toISOString(),
      });

    return true;
  } catch (error) {
    console.error('Rate limiting error:', error);
    return true; // Allow on error
  }
}

/**
 * Clean up old rate limit entries (call periodically)
 */
export async function cleanupRateLimitEntries(): Promise<void> {
  const supabase = getSupabaseClient();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  try {
    const { error } = await supabase
      .from('search_events')
      .delete()
      .lt('created_at', twentyFourHoursAgo);

    if (error) {
      console.error('Error cleaning up rate limit entries:', error);
    } else {
      console.log('Cleaned up old rate limit entries');
    }
  } catch (error) {
    console.error('Rate limit cleanup error:', error);
  }
}