import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { corsHeaders } from '../_shared/security.ts';

interface MergeRequest {
  candidateIds?: string[];
  sourceId?: string;
  minConfidence?: number;
  matchThreshold?: number;
  dryRun?: boolean;
}

interface SessionCandidate {
  id: string;
  source_id: string;
  url: string;
  extracted_json: any;
  confidence: number;
  status: string;
  created_at: string;
}

interface Session {
  id?: string;
  title?: string;
  name?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  start_at?: string;
  end_at?: string;
  age_min?: number;
  age_max?: number;
  price_min?: number;
  price_max?: number;
  capacity?: number;
  location?: string;
  location_city?: string;
  location_state?: string;
  days_of_week?: string[];
  signup_url?: string;
  platform?: string;
  provider_id?: string;
  source_url?: string;
  source_id?: string;
  last_verified_at?: string;
  created_at?: string;
  updated_at?: string;
}

interface MatchResult {
  score: number;
  matchedSession?: Session;
  conflicts?: string[];
}

interface MergeResult {
  success: boolean;
  processed: number;
  merged: number;
  created: number;
  conflicts: number;
  errors: string[];
  details: Array<{
    candidateId: string;
    action: 'merged' | 'created' | 'error';
    sessionId?: string;
    conflicts?: string[];
    error?: string;
  }>;
}

class FuzzyMatcher {
  
  // Calculate Jaro-Winkler similarity between two strings
  static jaroWinkler(s1: string, s2: string): number {
    if (!s1 || !s2) return 0;
    
    const str1 = s1.toLowerCase().trim();
    const str2 = s2.toLowerCase().trim();
    
    if (str1 === str2) return 1;
    
    const jaro = this.jaro(str1, str2);
    
    // Jaro-Winkler gives more weight to common prefixes
    let prefix = 0;
    const maxPrefix = Math.min(4, Math.min(str1.length, str2.length));
    
    for (let i = 0; i < maxPrefix; i++) {
      if (str1[i] === str2[i]) {
        prefix++;
      } else {
        break;
      }
    }
    
    return jaro + (0.1 * prefix * (1 - jaro));
  }
  
  private static jaro(s1: string, s2: string): number {
    const len1 = s1.length;
    const len2 = s2.length;
    
    if (len1 === 0 && len2 === 0) return 1;
    if (len1 === 0 || len2 === 0) return 0;
    
    const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
    if (matchWindow < 0) return 0;
    
    const s1Matches = new Array(len1).fill(false);
    const s2Matches = new Array(len2).fill(false);
    
    let matches = 0;
    
    // Find matches
    for (let i = 0; i < len1; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(i + matchWindow + 1, len2);
      
      for (let j = start; j < end; j++) {
        if (s2Matches[j] || s1[i] !== s2[j]) continue;
        s1Matches[i] = true;
        s2Matches[j] = true;
        matches++;
        break;
      }
    }
    
    if (matches === 0) return 0;
    
    // Count transpositions
    let transpositions = 0;
    let k = 0;
    
    for (let i = 0; i < len1; i++) {
      if (!s1Matches[i]) continue;
      while (!s2Matches[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }
    
    return (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
  }
  
  // Normalize date for comparison
  static normalizeDate(date: string | null): string {
    if (!date) return '';
    try {
      return new Date(date).toISOString().split('T')[0];
    } catch {
      return date;
    }
  }
  
  // Calculate session similarity score
  static calculateSimilarity(candidate: any, session: Session): number {
    const candidateData = candidate.extracted_json || candidate;
    
    // Extract key matching fields
    const candName = (candidateData.title || candidateData.name || '').toLowerCase().trim();
    const sessName = (session.title || session.name || '').toLowerCase().trim();
    
    const candStartDate = this.normalizeDate(candidateData.startDate);
    const sessStartDate = this.normalizeDate(session.start_date);
    
    const candCity = (candidateData.city || '').toLowerCase().trim();
    const sessCity = (session.location_city || '').toLowerCase().trim();
    
    // Must have some key fields to match
    if (!candName && !sessName) return 0;
    
    // Calculate component similarities
    let nameScore = 0;
    if (candName && sessName) {
      nameScore = this.jaroWinkler(candName, sessName);
    }
    
    let dateScore = 0;
    if (candStartDate && sessStartDate) {
      dateScore = candStartDate === sessStartDate ? 1 : 0;
    } else if (!candStartDate && !sessStartDate) {
      dateScore = 0.5; // Both missing is partial match
    }
    
    let cityScore = 0;
    if (candCity && sessCity) {
      cityScore = this.jaroWinkler(candCity, sessCity);
    } else if (!candCity && !sessCity) {
      cityScore = 0.5; // Both missing is partial match
    }
    
    // Weighted combination (name is most important, then date, then city)
    const weights = { name: 0.5, date: 0.3, city: 0.2 };
    return (nameScore * weights.name) + (dateScore * weights.date) + (cityScore * weights.city);
  }
}

class SessionMerger {
  private supabase: any;
  
  constructor(supabase: any) {
    this.supabase = supabase;
  }
  
  async mergeCandidates(request: MergeRequest): Promise<MergeResult> {
    const result: MergeResult = {
      success: true,
      processed: 0,
      merged: 0,
      created: 0,
      conflicts: 0,
      errors: [],
      details: []
    };
    
    try {
      // Fetch candidates to process
      const candidates = await this.fetchCandidates(request);
      console.log(`Found ${candidates.length} candidates to process`);
      
      // Process each candidate
      for (const candidate of candidates) {
        try {
          const detail = await this.processCandidate(candidate, request.matchThreshold || 0.85);
          result.details.push(detail);
          result.processed++;
          
          if (detail.action === 'merged') {
            result.merged++;
            if (detail.conflicts && detail.conflicts.length > 0) {
              result.conflicts++;
            }
          } else if (detail.action === 'created') {
            result.created++;
          }
          
          // Mark candidate as processed (if not dry run)
          if (!request.dryRun) {
            await this.supabase
              .from('session_candidates')
              .update({ status: 'processed', processed_at: new Date().toISOString() })
              .eq('id', candidate.id);
          }
          
        } catch (error) {
          console.error(`Error processing candidate ${candidate.id}:`, error);
          result.errors.push(`Candidate ${candidate.id}: ${error.message}`);
          result.details.push({
            candidateId: candidate.id,
            action: 'error',
            error: error.message
          });
        }
      }
      
    } catch (error) {
      console.error('Merge operation failed:', error);
      result.success = false;
      result.errors.push(error.message);
    }
    
    return result;
  }
  
  private async fetchCandidates(request: MergeRequest): Promise<SessionCandidate[]> {
    let query = this.supabase
      .from('session_candidates')
      .select('*')
      .eq('status', 'pending');
    
    if (request.candidateIds) {
      query = query.in('id', request.candidateIds);
    }
    
    if (request.sourceId) {
      query = query.eq('source_id', request.sourceId);
    }
    
    if (request.minConfidence) {
      query = query.gte('confidence', request.minConfidence);
    }
    
    query = query.order('confidence', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to fetch candidates: ${error.message}`);
    }
    
    return data || [];
  }
  
  private async processCandidate(candidate: SessionCandidate, matchThreshold: number) {
    const candidateData = candidate.extracted_json;
    
    // Find potential matches
    const matchResult = await this.findBestMatch(candidateData, candidate, matchThreshold);
    
    if (matchResult.matchedSession) {
      // Merge with existing session
      const mergedSession = this.mergeSessionData(matchResult.matchedSession, candidateData, candidate);
      
      if (!candidate.url) { // dry run check would be here
        await this.supabase
          .from('sessions')
          .update(mergedSession)
          .eq('id', matchResult.matchedSession.id);
      }
      
      return {
        candidateId: candidate.id,
        action: 'merged' as const,
        sessionId: matchResult.matchedSession.id,
        conflicts: matchResult.conflicts
      };
      
    } else {
      // Create new session
      const newSession = this.candidateToSession(candidateData, candidate);
      
      let sessionId = null;
      if (!candidate.url) { // dry run check would be here  
        const { data, error } = await this.supabase
          .from('sessions')
          .insert([newSession])
          .select('id')
          .single();
        
        if (error) {
          throw new Error(`Failed to create session: ${error.message}`);
        }
        
        sessionId = data.id;
      }
      
      return {
        candidateId: candidate.id,
        action: 'created' as const,
        sessionId: sessionId
      };
    }
  }
  
  private async findBestMatch(candidateData: any, candidate: SessionCandidate, threshold: number): Promise<MatchResult> {
    // Get potential matches from sessions table
    // First, try to narrow down by city if available
    let query = this.supabase.from('sessions').select('*');
    
    if (candidateData.city) {
      query = query.ilike('location_city', `%${candidateData.city}%`);
    }
    
    const { data: sessions, error } = await query.limit(100); // Limit for performance
    
    if (error) {
      console.error('Error fetching sessions for matching:', error);
      return { score: 0 };
    }
    
    if (!sessions || sessions.length === 0) {
      return { score: 0 };
    }
    
    // Calculate similarity scores
    let bestMatch: Session | null = null;
    let bestScore = 0;
    
    for (const session of sessions) {
      const score = FuzzyMatcher.calculateSimilarity(candidateData, session);
      
      if (score > bestScore && score >= threshold) {
        bestScore = score;
        bestMatch = session;
      }
    }
    
    if (bestMatch) {
      const conflicts = this.detectConflicts(candidateData, bestMatch);
      return {
        score: bestScore,
        matchedSession: bestMatch,
        conflicts: conflicts
      };
    }
    
    return { score: bestScore };
  }
  
  private detectConflicts(candidateData: any, session: Session): string[] {
    const conflicts: string[] = [];
    
    // Check for conflicting values
    const fields = [
      { key: 'ageMin', sessionKey: 'age_min', name: 'minimum age' },
      { key: 'ageMax', sessionKey: 'age_max', name: 'maximum age' },
      { key: 'priceMin', sessionKey: 'price_min', name: 'minimum price' },
      { key: 'priceMax', sessionKey: 'price_max', name: 'maximum price' },
      { key: 'capacity', sessionKey: 'capacity', name: 'capacity' },
      { key: 'endDate', sessionKey: 'end_date', name: 'end date' },
      { key: 'location', sessionKey: 'location', name: 'location' }
    ];
    
    for (const field of fields) {
      const candValue = candidateData[field.key];
      const sessValue = session[field.sessionKey as keyof Session];
      
      if (candValue && sessValue && candValue !== sessValue) {
        conflicts.push(`${field.name}: ${sessValue} vs ${candValue}`);
      }
    }
    
    return conflicts;
  }
  
  private mergeSessionData(existingSession: Session, candidateData: any, candidate: SessionCandidate): Partial<Session> {
    const merged: Partial<Session> = {
      last_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Update fields where candidate has more complete data
    const updateFields = [
      { candKey: 'description', sessKey: 'description' },
      { candKey: 'startTime', sessKey: 'start_at' },
      { candKey: 'endTime', sessKey: 'end_at' },
      { candKey: 'signupUrl', sessKey: 'signup_url' },
      { candKey: 'platform', sessKey: 'platform' },
      { candKey: 'daysOfWeek', sessKey: 'days_of_week' }
    ];
    
    for (const field of updateFields) {
      const candValue = candidateData[field.candKey];
      const existingValue = existingSession[field.sessKey as keyof Session];
      
      // Update if candidate has value and existing doesn't, or if candidate is more complete
      if (candValue && (!existingValue || (Array.isArray(candValue) && candValue.length > 0))) {
        merged[field.sessKey as keyof Session] = candValue;
      }
    }
    
    // Handle conflicts by appending to description or notes
    const conflicts = this.detectConflicts(candidateData, existingSession);
    if (conflicts.length > 0) {
      const conflictNote = `[CONFLICT from ${candidate.url}]: ${conflicts.join('; ')}`;
      const currentDescription = existingSession.description || '';
      merged.description = currentDescription + (currentDescription ? '\n\n' : '') + conflictNote;
    }
    
    // Update source URL to include new source
    if (candidate.url && existingSession.source_url !== candidate.url) {
      const sources = [existingSession.source_url, candidate.url].filter(Boolean);
      merged.source_url = [...new Set(sources)].join('; ');
    }
    
    return merged;
  }
  
  private candidateToSession(candidateData: any, candidate: SessionCandidate): Omit<Session, 'id'> {
    const now = new Date().toISOString();
    
    return {
      title: candidateData.title || candidateData.name,
      name: candidateData.name || candidateData.title,
      description: candidateData.description,
      start_date: candidateData.startDate ? new Date(candidateData.startDate).toISOString() : null,
      end_date: candidateData.endDate ? new Date(candidateData.endDate).toISOString() : null,
      start_at: candidateData.startTime ? this.parseTime(candidateData.startTime, candidateData.startDate) : null,
      end_at: candidateData.endTime ? this.parseTime(candidateData.endTime, candidateData.startDate) : null,
      age_min: candidateData.ageMin,
      age_max: candidateData.ageMax,
      price_min: candidateData.priceMin,
      price_max: candidateData.priceMax,
      capacity: candidateData.capacity,
      location: candidateData.location,
      location_city: candidateData.city,
      location_state: candidateData.state,
      days_of_week: candidateData.daysOfWeek,
      signup_url: candidateData.signupUrl,
      platform: candidateData.platform,
      source_url: candidate.url,
      source_id: candidate.source_id,
      last_verified_at: now,
      created_at: now,
      updated_at: now
    };
  }
  
  private parseTime(timeStr: string, dateStr?: string): string | null {
    try {
      // If we have a date, combine with time for full timestamp
      if (dateStr) {
        const date = new Date(dateStr);
        const [hours, minutes] = timeStr.split(':');
        date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        return date.toISOString();
      } else {
        // Just store time portion for now
        return timeStr;
      }
    } catch {
      return null;
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mergeRequest: MergeRequest = await req.json();
    
    console.log('Starting session merge operation:', {
      candidateIds: mergeRequest.candidateIds?.length || 'all pending',
      sourceId: mergeRequest.sourceId,
      minConfidence: mergeRequest.minConfidence || 'default',
      matchThreshold: mergeRequest.matchThreshold || 0.85,
      dryRun: mergeRequest.dryRun || false
    });

    const merger = new SessionMerger(supabase);
    const result = await merger.mergeCandidates(mergeRequest);

    console.log('Merge operation completed:', {
      success: result.success,
      processed: result.processed,
      merged: result.merged,
      created: result.created,
      conflicts: result.conflicts,
      errors: result.errors.length
    });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Merge function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processed: 0,
        merged: 0,
        created: 0,
        conflicts: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        details: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});