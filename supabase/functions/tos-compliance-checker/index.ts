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

async function checkPartnershipStatus(hostname: string, campProviderId?: string): Promise<{
  status: string;
  partnershipType?: string;
  confidence: number;
  lastContact?: string;
}> {
  try {
    // Check our partnership database
    const { data } = await supabase
      .from('camp_provider_partnerships')
      .select('status, partnership_type, last_contact, confidence_score')
      .or(`hostname.eq.${hostname},provider_id.eq.${campProviderId}`)
      .maybeSingle();
    
    if (data) {
      return {
        status: data.status,
        partnershipType: data.partnership_type,
        confidence: data.confidence_score || 0.8,
        lastContact: data.last_contact
      };
    }
    
    return {
      status: 'unknown',
      confidence: 0.3
    };
  } catch (error) {
    console.warn('Partnership status check failed:', error);
    return {
      status: 'unknown',
      confidence: 0.2
    };
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
    const truncatedContent = tosContent.substring(0, 12000);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          {
            role: 'system',
            content: `You are an expert AI assistant analyzing Terms of Service for camp and recreation providers to determine their policy regarding automated registration assistance tools.

            Context: We help parents register their children for camps by automating form completion with explicit parent consent. We are NOT scraping data or doing unauthorized actions.

            Analysis Framework:
            1. RESTRICTIVE: Explicitly prohibits bots, automation, or third-party registration tools
            2. NEUTRAL: No clear policy or standard legal language without specific restrictions
            3. PERMISSIVE: Allows or encourages third-party tools, APIs, or partner integrations
            4. CAMP-FRIENDLY: Consider that camps WANT registrations and typically welcome legitimate help

            Key Areas to Analyze:
            - Automated access policies
            - Bot/scraping restrictions  
            - Third-party booking/registration tools
            - Partner/integration policies
            - Registration assistance language
            - API availability mentions
            - Intent behind restrictions (anti-fraud vs anti-automation)

            Confidence Scoring:
            - 0.9-1.0: Extremely clear language either way
            - 0.7-0.8: Clear indications with good context
            - 0.5-0.6: Some indicators but ambiguous
            - 0.3-0.4: Unclear or conflicting signals
            - 0.1-0.2: Minimal or generic language

            Response format (JSON only):
            {
              "automationPolicy": "restrictive|neutral|permissive",
              "confidence": 0.0-1.0,
              "summary": "2-3 sentence explanation of the policy",
              "keyFindings": ["specific quotes or policies found"],
              "riskFactors": ["potential concerns"],
              "positiveSignals": ["camp-friendly or permissive elements"],
              "recommendation": "proceed|manual_review|avoid|seek_partnership",
              "reasoning": "why this recommendation was made",
              "complianceScore": 0.0-1.0
            }`
          },
          {
            role: 'user',
            content: `Analyze these Terms of Service for a camp/recreation provider:

URL Context: This appears to be from a camp or recreation provider website.

Terms of Service Content:
${truncatedContent}

Please provide a thorough analysis focused on whether this organization would allow or restrict automated registration assistance tools used by parents.`
          }
        ],
        max_completion_tokens: 800,
        temperature: 0.2
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      const parsed = JSON.parse(content);
      
      // Validate and enhance the response
      return {
        automationPolicy: parsed.automationPolicy || 'neutral',
        confidence: Math.min(1.0, Math.max(0.0, parsed.confidence || 0.5)),
        summary: parsed.summary || 'AI analysis completed',
        keyFindings: parsed.keyFindings || [],
        riskFactors: parsed.riskFactors || [],
        positiveSignals: parsed.positiveSignals || [],
        recommendation: parsed.recommendation || 'manual_review',
        reasoning: parsed.reasoning || 'Standard analysis applied',
        complianceScore: Math.min(1.0, Math.max(0.0, parsed.complianceScore || 0.5)),
        aiModel: 'gpt-5-mini-2025-08-07',
        analysisDate: new Date().toISOString()
      };
    } catch (parseError) {
      console.warn('Failed to parse AI response as JSON:', content);
      return {
        automationPolicy: 'neutral',
        confidence: 0.4,
        summary: 'AI response parsing failed, manual review needed',
        keyFindings: [],
        riskFactors: ['AI response not properly formatted'],
        recommendation: 'manual_review',
        reasoning: 'Could not parse structured AI response',
        complianceScore: 0.4,
        error: parseError.message,
        rawResponse: content.substring(0, 500)
      };
    }
    
  } catch (error) {
    console.error('AI TOS analysis failed:', error);
    return {
      automationPolicy: 'unknown',
      confidence: 0.2,
      summary: 'AI analysis failed due to technical error',
      keyFindings: [],
      riskFactors: ['AI analysis unavailable'],
      recommendation: 'manual_review',
      reasoning: 'Technical failure in AI analysis',
      complianceScore: 0.2,
      error: error.message
    };
  }
}

function calculateComplianceStatus(input: {
  robotsResult: any;
  providerType: string;
  partnershipStatus: any;
  tosAnalysis: any;
  hostname: string;
}): { status: 'green' | 'yellow' | 'red'; reason: string; confidence: number; recommendation: string; details: any } {
  
  const aiAnalysis = input.tosAnalysis?.aiAnalysis;
  const patternAnalysis = input.tosAnalysis?.patternAnalysis;
  
  // Calculate composite confidence score
  let compositeConfidence = 0.5;
  let confidenceFactors = [];
  
  if (aiAnalysis?.confidence) {
    compositeConfidence = Math.max(compositeConfidence, aiAnalysis.confidence);
    confidenceFactors.push(`AI: ${aiAnalysis.confidence}`);
  }
  
  if (patternAnalysis?.confidence) {
    compositeConfidence = Math.max(compositeConfidence, patternAnalysis.confidence * 0.8); // Pattern analysis weighted lower
    confidenceFactors.push(`Pattern: ${patternAnalysis.confidence}`);
  }
  
  if (input.partnershipStatus?.confidence) {
    compositeConfidence = Math.max(compositeConfidence, input.partnershipStatus.confidence);
    confidenceFactors.push(`Partnership: ${input.partnershipStatus.confidence}`);
  }
  
  // RED: Definite blocks (High confidence restrictions)
  if (!input.robotsResult.allowed) {
    return {
      status: 'red',
      reason: 'Robots.txt explicitly disallows automated access',
      confidence: 0.95,
      recommendation: 'Do not proceed - seek official API or partnership channel',
      details: {
        primaryFactor: 'robots_txt_block',
        robotsAllowed: false,
        confidenceFactors
      }
    };
  }
  
  if (input.partnershipStatus?.status === 'rejected') {
    return {
      status: 'red',
      reason: 'Partnership request was previously rejected',
      confidence: 0.98,
      recommendation: 'Do not proceed - respect previous rejection decision',
      details: {
        primaryFactor: 'partnership_rejected',
        partnershipStatus: input.partnershipStatus.status,
        confidenceFactors
      }
    };
  }
  
  // AI recommends avoiding AND high confidence
  if (aiAnalysis?.recommendation === 'avoid' && aiAnalysis?.confidence > 0.7) {
    return {
      status: 'red',
      reason: 'AI analysis indicates Terms of Service clearly prohibit automated registration tools',
      confidence: aiAnalysis.confidence,
      recommendation: 'Do not proceed - seek official API or direct partnership',
      details: {
        primaryFactor: 'ai_analysis_restrictive',
        aiSummary: aiAnalysis.summary,
        keyFindings: aiAnalysis.keyFindings,
        riskFactors: aiAnalysis.riskFactors,
        confidenceFactors
      }
    };
  }
  
  // Pattern analysis shows strong restriction
  if (patternAnalysis?.policy === 'restrictive' && patternAnalysis?.confidence > 0.8) {
    return {
      status: 'red',
      reason: 'Pattern analysis detected strong anti-automation language in Terms of Service',
      confidence: patternAnalysis.confidence,
      recommendation: 'Do not proceed - terms explicitly restrict automated tools',
      details: {
        primaryFactor: 'pattern_analysis_restrictive',
        patternSummary: patternAnalysis.summary,
        restrictiveMatches: patternAnalysis.restrictiveMatches,
        confidenceFactors
      }
    };
  }
  
  // GREEN: Definite approvals (High confidence permissions)
  if (input.partnershipStatus?.status === 'partner' || input.partnershipStatus?.status === 'approved') {
    return {
      status: 'green',
      reason: 'Official partnership or explicit approval exists',
      confidence: 0.98,
      recommendation: 'Proceed with full confidence - partnership authorized',
      details: {
        primaryFactor: 'official_partnership',
        partnershipType: input.partnershipStatus.partnershipType,
        lastContact: input.partnershipStatus.lastContact,
        confidenceFactors
      }
    };
  }
  
  // AI strongly recommends proceeding
  if (aiAnalysis?.recommendation === 'proceed' && aiAnalysis?.confidence > 0.7) {
    return {
      status: 'green',
      reason: 'AI analysis indicates Terms of Service allow automated registration assistance',
      confidence: aiAnalysis.confidence,
      recommendation: 'Proceed with standard compliance monitoring',
      details: {
        primaryFactor: 'ai_analysis_permissive',
        aiSummary: aiAnalysis.summary,
        positiveSignals: aiAnalysis.positiveSignals,
        complianceScore: aiAnalysis.complianceScore,
        confidenceFactors
      }
    };
  }
  
  // Known camp provider platform with permissive patterns
  if (input.providerType !== 'unknown' && input.providerType !== 'camp_provider' && 
      patternAnalysis?.policy === 'permissive') {
    return {
      status: 'green',
      reason: `Known camp provider (${input.providerType}) with permissive automation policy`,
      confidence: Math.min(0.85, compositeConfidence + 0.15),
      recommendation: 'Proceed with enhanced monitoring and partnership outreach',
      details: {
        primaryFactor: 'known_provider_permissive',
        providerType: input.providerType,
        patternAnalysis: patternAnalysis.summary,
        confidenceFactors
      }
    };
  }
  
  // YELLOW: Needs human review (Medium confidence or mixed signals)
  
  // AI suggests manual review or partnership
  if (aiAnalysis?.recommendation === 'manual_review' || aiAnalysis?.recommendation === 'seek_partnership') {
    return {
      status: 'yellow',
      reason: 'AI analysis suggests human review needed for nuanced Terms of Service',
      confidence: aiAnalysis?.confidence || 0.6,
      recommendation: 'Manual review recommended - consider proactive partnership outreach',
      details: {
        primaryFactor: 'ai_suggests_review',
        aiSummary: aiAnalysis?.summary,
        reasoning: aiAnalysis?.reasoning,
        keyFindings: aiAnalysis?.keyFindings,
        riskFactors: aiAnalysis?.riskFactors,
        confidenceFactors
      }
    };
  }
  
  // Known camp provider with neutral/unclear TOS
  if (input.providerType !== 'unknown') {
    return {
      status: 'yellow',
      reason: `Camp provider (${input.providerType}) with unclear automation policy`,
      confidence: Math.max(0.6, compositeConfidence),
      recommendation: 'Proceed cautiously with enhanced monitoring and partnership outreach',
      details: {
        primaryFactor: 'known_provider_unclear',
        providerType: input.providerType,
        tosAnalysis: tosAnalysis?.analysis || 'Neutral or unclear policy',
        confidenceFactors
      }
    };
  }
  
  // Default: Insufficient information
  return {
    status: 'yellow',
    reason: 'Insufficient information to make definitive compliance determination',
    confidence: compositeConfidence,
    recommendation: 'Manual review strongly recommended - gather more information or seek partnership',
    details: {
      primaryFactor: 'insufficient_information',
      availableData: {
        robotsAllowed: input.robotsResult.allowed,
        tosFound: !!input.tosAnalysis?.found,
        aiAnalysisAvailable: !!aiAnalysis,
        partnershipKnown: input.partnershipStatus?.status !== 'unknown'
      },
      confidenceFactors
    }
  };
}

async function getCachedAnalysis(url: string): Promise<TOSAnalysisResult | null> {
  try {
    const { data } = await supabase
      .from('tos_compliance_cache')
      .select('*')
      .eq('url', url)
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();
    
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