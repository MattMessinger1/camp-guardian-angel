import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

interface TOSAnalysisRequest {
  url: string;
  campProviderId?: string;
  forceRefresh?: boolean;
}

interface TOSAnalysisResult {
  status: 'green' | 'yellow' | 'red';
  reason: string;
  confidence: number;
  details: {
    robotsTxtAllowed: boolean;
    tosAnalysis: any;
    campProviderType: string;
    automationPolicy: string;
    partnershipStatus: string;
  };
  recommendation: string;
  lastChecked: string;
}

// Camp provider patterns that typically allow registrations
const CAMP_PROVIDER_PATTERNS = [
  'campwise', 'campminder', 'active.com', 'ymca', 'recdesk', 
  'daysmart', 'jackrabbit', 'sawyer', 'campbrain', 'ultracamp',
  'communitypass', 'playmetrics', 'trakstar', 'perfectmind'
];

// TOS patterns that indicate automation restrictions
const RESTRICTIVE_TOS_PATTERNS = [
  /automated.*prohibited/i,
  /bots?.*not.*allowed/i,
  /scraping.*forbidden/i,
  /automated.*access.*prohibited/i,
  /mechanical.*harvesting/i,
  /systematic.*retrieval/i
];

// TOS patterns that indicate automation allowance or neutrality
const PERMISSIVE_TOS_PATTERNS = [
  /registration.*automated/i,
  /api.*available/i,
  /third.*party.*integration/i,
  /automated.*booking/i,
  /partner.*access/i
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.warn('OpenAI API key not configured, using pattern-based analysis only');
    }

    const { url, campProviderId, forceRefresh }: TOSAnalysisRequest = await req.json();
    
    if (!url) {
      throw new Error('URL is required');
    }

    console.log('Analyzing TOS compliance for:', url);

    // Check cache first unless force refresh
    if (!forceRefresh) {
      const cached = await getCachedAnalysis(url);
      if (cached) {
        console.log('Returning cached TOS analysis');
        return new Response(JSON.stringify(cached), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Perform comprehensive TOS analysis
    const analysis = await performTOSAnalysis(url, campProviderId, openaiApiKey);
    
    // Cache the result
    await cacheAnalysis(url, analysis);
    
    // Log compliance event
    await logComplianceEvent(url, analysis);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('TOS compliance check error:', error);
    
    // Return yellow status for errors (requires human review)
    const fallbackResult: TOSAnalysisResult = {
      status: 'yellow',
      reason: `Analysis error: ${error.message}`,
      confidence: 0.3,
      details: {
        robotsTxtAllowed: false,
        tosAnalysis: null,
        campProviderType: 'unknown',
        automationPolicy: 'unknown',
        partnershipStatus: 'unknown'
      },
      recommendation: 'Manual review required due to analysis error',
      lastChecked: new Date().toISOString()
    };

    return new Response(JSON.stringify(fallbackResult), {
      status: 200, // Return 200 with yellow status rather than error
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function performTOSAnalysis(
  url: string, 
  campProviderId?: string, 
  openaiApiKey?: string
): Promise<TOSAnalysisResult> {
  const hostname = new URL(url).hostname;
  
  // Step 1: Check robots.txt
  const robotsResult = await checkRobotsTxt(hostname);
  
  // Step 2: Identify camp provider type
  const providerType = identifyProviderType(hostname);
  
  // Step 3: Check partnership status
  const partnershipStatus = await checkPartnershipStatus(hostname, campProviderId);
  
  // Step 4: Fetch and analyze TOS
  const tosAnalysis = await analyzeTOS(hostname, openaiApiKey);
  
  // Step 5: Calculate overall compliance status
  const complianceResult = calculateComplianceStatus({
    robotsResult,
    providerType,
    partnershipStatus,
    tosAnalysis,
    hostname
  });

  return {
    status: complianceResult.status,
    reason: complianceResult.reason,
    confidence: complianceResult.confidence,
    details: {
      robotsTxtAllowed: robotsResult.allowed,
      tosAnalysis,
      campProviderType: providerType,
      automationPolicy: tosAnalysis?.automationPolicy || 'unknown',
      partnershipStatus
    },
    recommendation: complianceResult.recommendation,
    lastChecked: new Date().toISOString()
  };
}

async function checkRobotsTxt(hostname: string): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const robotsUrl = `https://${hostname}/robots.txt`;
    const response = await fetch(robotsUrl, {
      headers: { 'User-Agent': 'CampScheduleBot/1.0 (+https://campschedule.com/bot)' },
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      return { allowed: true }; // No robots.txt = allowed
    }
    
    const robotsContent = await response.text();
    const lines = robotsContent.split('\n').map(line => line.trim().toLowerCase());
    
    let isRelevantSection = false;
    let disallowAll = false;
    
    for (const line of lines) {
      if (line.startsWith('user-agent:')) {
        const agent = line.split(':', 2)[1].trim();
        isRelevantSection = agent === '*' || agent.includes('bot') || agent.includes('campschedule');
        continue;
      }
      
      if (!isRelevantSection) continue;
      
      if (line.startsWith('disallow:')) {
        const path = line.split(':', 2)[1].trim();
        if (path === '/' || path === '') {
          disallowAll = true;
        }
      }
    }
    
    return { 
      allowed: !disallowAll, 
      reason: disallowAll ? 'Robots.txt disallows all access' : undefined 
    };
    
  } catch (error) {
    console.warn('Robots.txt check failed:', error);
    return { allowed: true }; // Assume allowed if check fails
  }
}

function identifyProviderType(hostname: string): string {
  for (const pattern of CAMP_PROVIDER_PATTERNS) {
    if (hostname.includes(pattern)) {
      return pattern;
    }
  }
  
  // Check for common camp/recreation keywords
  if (hostname.includes('camp') || hostname.includes('recreation') || hostname.includes('ymca')) {
    return 'camp_provider';
  }
  
  return 'unknown';
}

async function checkPartnershipStatus(hostname: string, campProviderId?: string): Promise<string> {
  try {
    // Check our partnership database
    const { data } = await supabase
      .from('camp_provider_partnerships')
      .select('status, partnership_type')
      .or(`hostname.eq.${hostname},provider_id.eq.${campProviderId}`)
      .single();
    
    if (data) {
      return data.status; // 'partner', 'approved', 'pending', 'rejected'
    }
    
    return 'unknown';
  } catch (error) {
    console.warn('Partnership status check failed:', error);
    return 'unknown';
  }
}

async function analyzeTOS(hostname: string, openaiApiKey?: string): Promise<any> {
  try {
    // Try to fetch TOS/Terms page
    const tosUrls = [
      `https://${hostname}/terms`,
      `https://${hostname}/terms-of-service`,
      `https://${hostname}/legal/terms`,
      `https://${hostname}/terms-and-conditions`
    ];
    
    let tosContent = '';
    let tosUrl = '';
    
    for (const url of tosUrls) {
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': 'CampScheduleBot/1.0 (+https://campschedule.com/bot)' },
          signal: AbortSignal.timeout(10000)
        });
        
        if (response.ok) {
          tosContent = await response.text();
          tosUrl = url;
          break;
        }
      } catch (error) {
        continue;
      }
    }
    
    if (!tosContent) {
      return {
        found: false,
        automationPolicy: 'unknown',
        analysis: 'No terms of service found'
      };
    }
    
    // Pattern-based analysis
    const patternAnalysis = analyzeWithPatterns(tosContent);
    
    // AI-enhanced analysis if OpenAI is available
    let aiAnalysis = null;
    if (openaiApiKey && tosContent.length > 100) {
      aiAnalysis = await analyzeWithAI(tosContent, openaiApiKey);
    }
    
    return {
      found: true,
      url: tosUrl,
      automationPolicy: patternAnalysis.policy,
      patternAnalysis,
      aiAnalysis,
      analysis: aiAnalysis?.summary || patternAnalysis.summary
    };
    
  } catch (error) {
    console.warn('TOS analysis failed:', error);
    return {
      found: false,
      automationPolicy: 'unknown',
      analysis: 'TOS analysis failed',
      error: error.message
    };
  }
}

function analyzeWithPatterns(tosContent: string): any {
  const lowerContent = tosContent.toLowerCase();
  
  let restrictiveMatches = 0;
  let permissiveMatches = 0;
  
  for (const pattern of RESTRICTIVE_TOS_PATTERNS) {
    if (pattern.test(lowerContent)) {
      restrictiveMatches++;
    }
  }
  
  for (const pattern of PERMISSIVE_TOS_PATTERNS) {
    if (pattern.test(lowerContent)) {
      permissiveMatches++;
    }
  }
  
  let policy = 'neutral';
  let summary = 'No clear automation policy found';
  
  if (restrictiveMatches > permissiveMatches) {
    policy = 'restrictive';
    summary = 'Terms appear to restrict automated access';
  } else if (permissiveMatches > restrictiveMatches) {
    policy = 'permissive';
    summary = 'Terms appear to allow automated access';
  }
  
  return {
    policy,
    summary,
    restrictiveMatches,
    permissiveMatches,
    confidence: Math.min(0.8, Math.max(0.3, Math.abs(restrictiveMatches - permissiveMatches) * 0.2))
  };
}

async function analyzeWithAI(tosContent: string, openaiApiKey: string): Promise<any> {
  try {
    // Truncate content to avoid token limits
    const truncatedContent = tosContent.substring(0, 8000);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are analyzing Terms of Service for camp/recreation providers to determine their policy on automated registration assistance. 
            
            Focus on:
            1. Automation/bot policies
            2. Registration assistance policies  
            3. Third-party booking policies
            4. Partner/API access policies
            
            Respond with JSON: {
              "automationPolicy": "restrictive|neutral|permissive",
              "confidence": 0.0-1.0,
              "summary": "brief explanation",
              "keyFindings": ["finding1", "finding2"],
              "recommendation": "proceed|manual_review|avoid"
            }`
          },
          {
            role: 'user',
            content: `Analyze this Terms of Service content:\n\n${truncatedContent}`
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      return JSON.parse(content);
    } catch (parseError) {
      console.warn('Failed to parse AI response as JSON:', content);
      return {
        automationPolicy: 'neutral',
        confidence: 0.5,
        summary: content,
        recommendation: 'manual_review'
      };
    }
    
  } catch (error) {
    console.warn('AI TOS analysis failed:', error);
    return {
      automationPolicy: 'unknown',
      confidence: 0.3,
      summary: 'AI analysis failed',
      error: error.message,
      recommendation: 'manual_review'
    };
  }
}

function calculateComplianceStatus(input: {
  robotsResult: any;
  providerType: string;
  partnershipStatus: string;
  tosAnalysis: any;
  hostname: string;
}): { status: 'green' | 'yellow' | 'red'; reason: string; confidence: number; recommendation: string } {
  
  // RED: Definite blocks
  if (!input.robotsResult.allowed) {
    return {
      status: 'red',
      reason: 'Robots.txt explicitly disallows access',
      confidence: 0.9,
      recommendation: 'Do not proceed - seek partnership or manual registration'
    };
  }
  
  if (input.partnershipStatus === 'rejected') {
    return {
      status: 'red',
      reason: 'Partnership request was rejected',
      confidence: 0.95,
      recommendation: 'Do not proceed - respect rejection'
    };
  }
  
  if (input.tosAnalysis?.aiAnalysis?.recommendation === 'avoid' || 
      (input.tosAnalysis?.patternAnalysis?.policy === 'restrictive' && 
       input.tosAnalysis?.patternAnalysis?.confidence > 0.7)) {
    return {
      status: 'red',
      reason: 'Terms of service clearly prohibit automated access',
      confidence: input.tosAnalysis.aiAnalysis?.confidence || input.tosAnalysis.patternAnalysis?.confidence || 0.8,
      recommendation: 'Do not proceed - seek official API or partnership'
    };
  }
  
  // GREEN: Definite approvals
  if (input.partnershipStatus === 'partner' || input.partnershipStatus === 'approved') {
    return {
      status: 'green',
      reason: 'Official partnership or approval exists',
      confidence: 0.95,
      recommendation: 'Proceed with confidence'
    };
  }
  
  if (input.tosAnalysis?.aiAnalysis?.recommendation === 'proceed' ||
      (input.tosAnalysis?.patternAnalysis?.policy === 'permissive' && 
       input.tosAnalysis?.patternAnalysis?.confidence > 0.6)) {
    return {
      status: 'green',
      reason: 'Terms of service appear to allow automated registration assistance',
      confidence: input.tosAnalysis.aiAnalysis?.confidence || input.tosAnalysis.patternAnalysis?.confidence || 0.7,
      recommendation: 'Proceed with standard compliance monitoring'
    };
  }
  
  // Known camp provider with neutral/unknown TOS
  if (input.providerType !== 'unknown' && input.providerType !== 'camp_provider') {
    return {
      status: 'green',
      reason: `Known camp provider (${input.providerType}) with no explicit restrictions`,
      confidence: 0.75,
      recommendation: 'Proceed with enhanced monitoring and partnership outreach'
    };
  }
  
  // YELLOW: Needs review
  return {
    status: 'yellow',
    reason: 'Insufficient information or neutral TOS policy',
    confidence: 0.5,
    recommendation: 'Manual review recommended - consider partnership outreach'
  };
}

async function getCachedAnalysis(url: string): Promise<TOSAnalysisResult | null> {
  try {
    const { data } = await supabase
      .from('tos_compliance_cache')
      .select('*')
      .eq('url', url)
      .gte('expires_at', new Date().toISOString())
      .single();
    
    if (data) {
      return data.analysis_result;
    }
    
    return null;
  } catch (error) {
    console.warn('Cache lookup failed:', error);
    return null;
  }
}

async function cacheAnalysis(url: string, analysis: TOSAnalysisResult): Promise<void> {
  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Cache for 24 hours
    
    await supabase.from('tos_compliance_cache').upsert({
      url,
      analysis_result: analysis,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.warn('Failed to cache analysis:', error);
  }
}

async function logComplianceEvent(url: string, analysis: TOSAnalysisResult): Promise<void> {
  try {
    await supabase.from('compliance_audit').insert({
      event_type: 'TOS_COMPLIANCE_CHECK',
      event_data: {
        url,
        hostname: new URL(url).hostname,
        status: analysis.status,
        confidence: analysis.confidence,
        reason: analysis.reason,
        automationPolicy: analysis.details.automationPolicy,
        partnershipStatus: analysis.details.partnershipStatus,
        timestamp: new Date().toISOString()
      },
      payload_summary: `TOS compliance: ${analysis.status} - ${analysis.reason}`
    });
  } catch (error) {
    console.warn('Failed to log compliance event:', error);
  }
}