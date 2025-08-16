import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { corsHeaders } from '../_shared/security.ts';

interface AvailabilityRequest {
  sessionIds?: string[];
  sourceId?: string;
  urls?: string[];
  batchSize?: number;
}

interface AvailabilityResult {
  success: boolean;
  processed: number;
  updated: number;
  errors: string[];
  results: Array<{
    sessionId?: string;
    url: string;
    status: AvailabilityStatus;
    evidence: string[];
    confidence: number;
    lastChecked: string;
    error?: string;
  }>;
}

type AvailabilityStatus = 'open' | 'limited' | 'waitlist' | 'full' | 'unknown';

interface AvailabilityHint {
  pattern: RegExp;
  status: AvailabilityStatus;
  weight: number;
  description: string;
}

class AvailabilityDetector {
  private hints: AvailabilityHint[] = [
    // FULL / SOLD OUT patterns
    { pattern: /\b(sold\s?out|fully\s?booked|no\s?spaces?\s?available|class\s?full|session\s?full|camp\s?full)\b/i, status: 'full', weight: 0.9, description: 'Explicit "sold out" or "full" text' },
    { pattern: /\b(registration\s?closed|enrollment\s?closed|closed\s?for\s?registration)\b/i, status: 'full', weight: 0.8, description: 'Registration closed message' },
    { pattern: /<[^>]*\b(sold-?out|full|closed)\b[^>]*>/i, status: 'full', weight: 0.7, description: 'CSS class suggests full status' },
    
    // WAITLIST patterns
    { pattern: /\b(join\s?waitlist|add\s?to\s?waitlist|waitlist\s?available|join\s?waiting\s?list)\b/i, status: 'waitlist', weight: 0.9, description: 'Waitlist available' },
    { pattern: /\b(waitlist|waiting\s?list)\b/i, status: 'waitlist', weight: 0.6, description: 'Waitlist mentioned' },
    { pattern: /button[^>]*>.*waitlist.*<\/button>/i, status: 'waitlist', weight: 0.8, description: 'Waitlist button found' },
    
    // LIMITED AVAILABILITY patterns
    { pattern: /\b(few\s?spots?\s?left|limited\s?spaces?|only\s?\d+\s?spots?\s?left|hurry|almost\s?full)\b/i, status: 'limited', weight: 0.8, description: 'Limited availability warning' },
    { pattern: /\b(\d+\s?spots?\s?remaining|\d+\s?spaces?\s?left)\b/i, status: 'limited', weight: 0.7, description: 'Specific spots remaining count' },
    
    // REGISTRATION NOT YET OPEN patterns
    { pattern: /\b(registration\s?opens?|registration\s?begins?|enrollment\s?starts?|sign[- ]?up\s?opens?)\b/i, status: 'waitlist', weight: 0.7, description: 'Registration not yet open' },
    { pattern: /\b(coming\s?soon|opens?\s?(on|at)|available\s?(on|at))\b/i, status: 'waitlist', weight: 0.6, description: 'Future availability indicated' },
    
    // OPEN patterns (positive indicators)
    { pattern: /\b(register\s?now|sign\s?up\s?now|enroll\s?now|book\s?now|available\s?now)\b/i, status: 'open', weight: 0.7, description: 'Active registration call-to-action' },
    { pattern: /\b(spaces?\s?available|spots?\s?available|enrollment\s?open|registration\s?open)\b/i, status: 'open', weight: 0.6, description: 'Availability confirmed' },
    { pattern: /button[^>]*>.*register.*<\/button>/i, status: 'open', weight: 0.5, description: 'Register button found' },
    
    // VISUAL INDICATORS
    { pattern: /<[^>]*strike[^>]*>.*\$[\d,]+.*<\/[^>]*>/i, status: 'full', weight: 0.6, description: 'Strikethrough pricing suggests unavailable' },
    { pattern: /<[^>]*disabled[^>]*>.*register.*<\/[^>]*>/i, status: 'full', weight: 0.7, description: 'Disabled registration button' },
    { pattern: /class="[^"]*disabled[^"]*"[^>]*>.*register/i, status: 'full', weight: 0.6, description: 'Disabled registration element' },
    
    // NEGATIVE INDICATORS (things that suggest NOT available)
    { pattern: /\b(try\s?again\s?later|check\s?back|contact\s?us\s?for\s?availability)\b/i, status: 'full', weight: 0.5, description: 'Suggests checking back later' },
  ];
  
  private supabase: any;
  
  constructor(supabase: any) {
    this.supabase = supabase;
  }
  
  async checkAvailability(request: AvailabilityRequest): Promise<AvailabilityResult> {
    const result: AvailabilityResult = {
      success: true,
      processed: 0,
      updated: 0,
      errors: [],
      results: []
    };
    
    try {
      let urlsToCheck: Array<{ url: string; sessionId?: string }> = [];
      
      // Gather URLs to check
      if (request.urls) {
        urlsToCheck = request.urls.map(url => ({ url }));
      } else {
        urlsToCheck = await this.getSessionUrls(request);
      }
      
      console.log(`Checking availability for ${urlsToCheck.length} URLs`);
      
      // Process URLs in batches
      const batchSize = request.batchSize || 5;
      for (let i = 0; i < urlsToCheck.length; i += batchSize) {
        const batch = urlsToCheck.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(item => this.checkSingleUrl(item.url, item.sessionId))
        );
        
        result.results.push(...batchResults);
        result.processed += batch.length;
        
        // Count successful updates
        result.updated += batchResults.filter(r => !r.error && r.status !== 'unknown').length;
        
        // Collect errors
        const errors = batchResults.filter(r => r.error).map(r => r.error!);
        result.errors.push(...errors);
        
        // Rate limiting between batches
        if (i + batchSize < urlsToCheck.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
    } catch (error) {
      console.error('Availability check failed:', error);
      result.success = false;
      result.errors.push(error.message);
    }
    
    return result;
  }
  
  private async getSessionUrls(request: AvailabilityRequest): Promise<Array<{ url: string; sessionId: string }>> {
    let query = this.supabase
      .from('sessions')
      .select('id, signup_url, source_url')
      .not('signup_url', 'is', null);
    
    if (request.sessionIds) {
      query = query.in('id', request.sessionIds);
    }
    
    if (request.sourceId) {
      query = query.eq('source_id', request.sourceId);
    }
    
    query = query.limit(50); // Reasonable limit for batch processing
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to fetch session URLs: ${error.message}`);
    }
    
    return (data || []).map(session => ({
      url: session.signup_url || session.source_url,
      sessionId: session.id
    })).filter(item => item.url);
  }
  
  private async checkSingleUrl(url: string, sessionId?: string): Promise<{
    sessionId?: string;
    url: string;
    status: AvailabilityStatus;
    evidence: string[];
    confidence: number;
    lastChecked: string;
    error?: string;
  }> {
    const now = new Date().toISOString();
    
    try {
      console.log(`Checking availability for: ${url}`);
      
      // Fetch the page
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CampScheduleBot/1.0 (Availability Checker)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: AbortSignal.timeout(15000)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      
      // Analyze the page
      const analysis = this.analyzePageContent(html);
      
      // Update database if we have a session ID
      if (sessionId && analysis.status !== 'unknown') {
        await this.updateSessionAvailability(sessionId, analysis.status, analysis.evidence);
      }
      
      return {
        sessionId,
        url,
        status: analysis.status,
        evidence: analysis.evidence,
        confidence: analysis.confidence,
        lastChecked: now
      };
      
    } catch (error) {
      console.error(`Error checking ${url}:`, error);
      return {
        sessionId,
        url,
        status: 'unknown',
        evidence: [],
        confidence: 0,
        lastChecked: now,
        error: error.message
      };
    }
  }
  
  private analyzePageContent(html: string): {
    status: AvailabilityStatus;
    evidence: string[];
    confidence: number;
  } {
    // Clean HTML for better text analysis
    const cleanedHtml = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');
    
    const textContent = cleanedHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Score each availability status
    const scores: Record<AvailabilityStatus, number> = {
      'open': 0,
      'limited': 0,
      'waitlist': 0,
      'full': 0,
      'unknown': 0
    };
    
    const evidence: string[] = [];
    
    // Apply all hints
    for (const hint of this.hints) {
      const matches = cleanedHtml.match(hint.pattern) || textContent.match(hint.pattern);
      if (matches) {
        scores[hint.status] += hint.weight;
        evidence.push(`${hint.description}: "${matches[0].trim()}"`);
      }
    }
    
    // Additional contextual analysis
    this.applyContextualAnalysis(cleanedHtml, textContent, scores, evidence);
    
    // Determine final status
    let finalStatus: AvailabilityStatus = 'unknown';
    let maxScore = 0;
    
    for (const [status, score] of Object.entries(scores)) {
      if (status !== 'unknown' && score > maxScore) {
        maxScore = score;
        finalStatus = status as AvailabilityStatus;
      }
    }
    
    // If no clear signals, default to unknown
    if (maxScore < 0.3) {
      finalStatus = 'unknown';
    }
    
    // Calculate confidence (0-1)
    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
    const confidence = totalScore > 0 ? Math.min(maxScore / totalScore, 1) : 0;
    
    return {
      status: finalStatus,
      evidence: evidence,
      confidence: confidence
    };
  }
  
  private applyContextualAnalysis(
    html: string, 
    text: string, 
    scores: Record<AvailabilityStatus, number>, 
    evidence: string[]
  ): void {
    // Button analysis
    const buttonMatches = html.match(/<button[^>]*>([^<]+)<\/button>/gi) || [];
    const linkMatches = html.match(/<a[^>]*>([^<]+)<\/a>/gi) || [];
    
    for (const button of [...buttonMatches, ...linkMatches]) {
      const buttonText = button.replace(/<[^>]+>/g, '').trim().toLowerCase();
      
      if (buttonText.includes('register') || buttonText.includes('sign up') || buttonText.includes('enroll')) {
        if (button.includes('disabled') || button.includes('class="disabled"')) {
          scores.full += 0.7;
          evidence.push(`Disabled registration button: "${buttonText}"`);
        } else {
          scores.open += 0.5;
          evidence.push(`Active registration button: "${buttonText}"`);
        }
      }
      
      if (buttonText.includes('waitlist') || buttonText.includes('waiting list')) {
        scores.waitlist += 0.8;
        evidence.push(`Waitlist button: "${buttonText}"`);
      }
    }
    
    // Form analysis
    if (html.includes('<form') && html.includes('register')) {
      scores.open += 0.3;
      evidence.push('Registration form present');
    }
    
    // Date-based analysis
    const currentYear = new Date().getFullYear();
    const datePattern = new RegExp(`\\b(${currentYear}|${currentYear + 1})\\b`);
    if (!datePattern.test(text)) {
      scores.full += 0.2;
      evidence.push('No current year dates found (possibly outdated)');
    }
    
    // Price analysis
    const priceMatches = text.match(/\$[\d,]+(?:\.\d{2})?/g);
    if (priceMatches && priceMatches.length > 0) {
      scores.open += 0.2;
      evidence.push('Pricing information displayed');
    }
    
    // Contact information analysis
    if (text.includes('contact us') && text.includes('available')) {
      scores.limited += 0.3;
      evidence.push('Contact required for availability');
    }
  }
  
  private async updateSessionAvailability(
    sessionId: string, 
    status: AvailabilityStatus, 
    evidence: string[]
  ): Promise<void> {
    const { error } = await this.supabase
      .from('sessions')
      .update({
        availability_status: status,
        last_verified_at: new Date().toISOString(),
        // Store evidence in a notes field if available
        // notes: evidence.join('; ')
      })
      .eq('id', sessionId);
    
    if (error) {
      console.error(`Failed to update session ${sessionId}:`, error);
    }
  }
}

Deno.serve(async (req) => {
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

    const availabilityRequest: AvailabilityRequest = await req.json();
    
    console.log('Starting availability check:', {
      sessionIds: availabilityRequest.sessionIds?.length || 'none',
      sourceId: availabilityRequest.sourceId || 'none',
      urls: availabilityRequest.urls?.length || 'none',
      batchSize: availabilityRequest.batchSize || 5
    });

    const detector = new AvailabilityDetector(supabase);
    const result = await detector.checkAvailability(availabilityRequest);

    console.log('Availability check completed:', {
      success: result.success,
      processed: result.processed,
      updated: result.updated,
      errors: result.errors.length
    });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Availability check function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processed: 0,
        updated: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        results: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});