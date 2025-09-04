/**
 * Smart Provider Detection System
 * 
 * Intelligent provider detection that considers technical capabilities,
 * partnership status, and real-time conditions to optimize automation strategies.
 */

import { supabase } from '@/integrations/supabase/client';
import { enhancedProviderIntelligence } from './EnhancedProviderIntelligence';

export interface SmartDetectionResult {
  provider: {
    hostname: string;
    platform: string;
    confidence: number;
    category: 'ymca' | 'private_camp' | 'recreation_center' | 'sports_facility' | 'unknown';
  };
  
  automation: {
    recommendedStrategy: 'api_first' | 'browser_optimized' | 'hybrid' | 'manual_assist';
    confidence: number;
    expectedSuccess: number;
    estimatedDuration: number;
    riskLevel: 'low' | 'medium' | 'high';
  };
  
  partnership: {
    status: 'partner' | 'potential' | 'neutral' | 'restricted';
    level: 'platinum' | 'gold' | 'silver' | 'bronze' | 'none';
    outreachRecommendation?: string;
    expectedBenefits?: string[];
  };

  realtime: {
    currentLoad: number;
    optimalTiming: string;
    waitTime: number;
    queuePosition?: number;
  };
}

export class SmartProviderDetection {
  private detectionCache = new Map<string, SmartDetectionResult>();
  private platformSignatures: Map<string, RegExp[]> = new Map();

  constructor() {
    this.initializePlatformSignatures();
  }

  /**
   * Comprehensive smart detection with real-time optimization
   */
  async detectProvider(url: string, context?: {
    userPreferences?: any;
    urgencyLevel?: 'low' | 'medium' | 'high';
    timeConstraints?: { deadline?: string; flexible?: boolean };
  }): Promise<SmartDetectionResult> {
    const hostname = this.extractHostname(url);
    
    // Check cache for recent detection
    const cached = this.detectionCache.get(`${hostname}-${Date.now().toString().slice(0, -5)}`);
    if (cached) return cached;

    console.log('Running smart provider detection:', hostname);

    // Parallel analysis for speed
    const [
      providerAnalysis,
      partnershipAnalysis, 
      realtimeAnalysis,
      automationAnalysis
    ] = await Promise.all([
      this.analyzeProviderDetails(url),
      this.analyzePartnershipOpportunity(url),
      this.analyzeRealtimeConditions(url),
      this.analyzeAutomationStrategy(url, context)
    ]);

    const result: SmartDetectionResult = {
      provider: providerAnalysis,
      automation: automationAnalysis,
      partnership: partnershipAnalysis,
      realtime: realtimeAnalysis
    };

    // Cache result for 5 minutes
    this.detectionCache.set(`${hostname}-${Date.now().toString().slice(0, -5)}`, result);
    
    // Log detection for learning
    await this.logDetectionResult(url, result);

    return result;
  }

  /**
   * Get optimal automation timing based on provider patterns
   */
  async getOptimalTiming(url: string): Promise<{
    bestTimeSlots: Array<{ start: string; end: string; confidence: number }>;
    avoidanceWindows: Array<{ start: string; end: string; reason: string }>;
    currentRecommendation: 'proceed' | 'wait' | 'schedule';
    waitSuggestion?: { minutes: number; reason: string };
  }> {
    const enhanced = await enhancedProviderIntelligence.analyzeProviderEnhanced(url);
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();

    // Check business hours if we have partnership data
    const businessHours = enhanced.partnershipDetails.businessHours;
    const peakHours = enhanced.realtimeMetrics.peakHours.map(h => parseInt(h));
    const maintenanceHours = enhanced.realtimeMetrics.maintenanceWindows.map(h => parseInt(h));

    let currentRecommendation: 'proceed' | 'wait' | 'schedule' = 'proceed';
    let waitSuggestion: { minutes: number; reason: string } | undefined;

    // Check maintenance windows
    if (maintenanceHours.includes(currentHour)) {
      currentRecommendation = 'wait';
      waitSuggestion = {
        minutes: (maintenanceHours[maintenanceHours.length - 1] + 1 - currentHour) * 60,
        reason: 'Provider maintenance window detected'
      };
    }

    // Check if current load is too high
    if (enhanced.realtimeMetrics.currentLoad > 0.8) {
      currentRecommendation = 'wait';
      waitSuggestion = {
        minutes: 15,
        reason: 'High provider load detected'
      };
    }

    // Generate optimal time slots (next 24 hours)
    const bestTimeSlots = [];
    for (let hour = 0; hour < 24; hour++) {
      const targetHour = (currentHour + hour) % 24;
      
      if (!maintenanceHours.includes(targetHour) && !peakHours.includes(targetHour)) {
        const confidence = this.calculateTimeSlotConfidence(targetHour, enhanced);
        if (confidence > 0.6) {
          bestTimeSlots.push({
            start: `${targetHour.toString().padStart(2, '0')}:00`,
            end: `${((targetHour + 1) % 24).toString().padStart(2, '0')}:00`,
            confidence
          });
        }
      }
    }

    return {
      bestTimeSlots: bestTimeSlots.slice(0, 5), // Top 5 slots
      avoidanceWindows: [
        ...maintenanceHours.map(h => ({
          start: `${h.toString().padStart(2, '0')}:00`,
          end: `${((h + 1) % 24).toString().padStart(2, '0')}:00`,
          reason: 'Maintenance window'
        })),
        ...peakHours.map(h => ({
          start: `${h.toString().padStart(2, '0')}:00`, 
          end: `${((h + 1) % 24).toString().padStart(2, '0')}:00`,
          reason: 'Peak traffic hours'
        }))
      ],
      currentRecommendation,
      waitSuggestion
    };
  }

  /**
   * Predict automation success probability
   */
  async predictSuccess(url: string, automationType: string): Promise<{
    probability: number;
    factors: Array<{ factor: string; impact: number; description: string }>;
    recommendations: string[];
    estimatedDuration: { min: number; max: number; average: number };
  }> {
    const enhanced = await enhancedProviderIntelligence.analyzeProviderEnhanced(url);
    
    let baseProbability = enhanced.metrics.successRate;
    const factors = [];

    // Partnership factor
    if (enhanced.relationshipStatus === 'partner') {
      baseProbability *= 1.2;
      factors.push({
        factor: 'Partnership Status',
        impact: 0.2,
        description: 'Active partnership increases success rate'
      });
    }

    // Compliance factor
    if (enhanced.complianceStatus === 'green') {
      baseProbability *= 1.1;
      factors.push({
        factor: 'Compliance Status',
        impact: 0.1,
        description: 'Green compliance status improves reliability'
      });
    } else if (enhanced.complianceStatus === 'red') {
      baseProbability *= 0.5;
      factors.push({
        factor: 'Compliance Issues',
        impact: -0.5,
        description: 'Compliance issues significantly reduce success rate'
      });
    }

    // Load factor
    if (enhanced.realtimeMetrics.currentLoad > 0.8) {
      baseProbability *= 0.8;
      factors.push({
        factor: 'High Load',
        impact: -0.2,
        description: 'High server load reduces success probability'
      });
    }

    // Platform capability factor
    const capability = enhanced.capabilities[this.getCapabilityForAutomationType(automationType)];
    if (!capability) {
      baseProbability *= 0.6;
      factors.push({
        factor: 'Platform Capability',
        impact: -0.4,
        description: `${automationType} not well supported on this platform`
      });
    }

    const finalProbability = Math.min(0.95, Math.max(0.05, baseProbability));

    return {
      probability: finalProbability,
      factors,
      recommendations: this.generateRecommendations(enhanced, finalProbability),
      estimatedDuration: this.estimateAutomationDuration(enhanced, automationType)
    };
  }

  // Private methods

  private initializePlatformSignatures() {
    this.platformSignatures.set('ymca', [
      /activenet/i,
      /ymca.*registration/i,
      /daxko/i
    ]);
    
    this.platformSignatures.set('jackrabbit_class', [
      /jackrabbitclass/i,
      /jackrabbit.*technologies/i
    ]);
    
    this.platformSignatures.set('camp_brain', [
      /campbrain/i,
      /camping.*software/i
    ]);
  }

  private async analyzeProviderDetails(url: string): Promise<SmartDetectionResult['provider']> {
    const hostname = this.extractHostname(url);
    
    // Pattern-based detection
    let platform = 'unknown';
    let confidence = 0.5;
    let category: SmartDetectionResult['provider']['category'] = 'unknown';

    for (const [platformName, patterns] of this.platformSignatures.entries()) {
      for (const pattern of patterns) {
        if (pattern.test(hostname) || pattern.test(url)) {
          platform = platformName;
          confidence = 0.9;
          break;
        }
      }
    }

    // Categorize provider
    if (hostname.includes('ymca') || platform === 'ymca') {
      category = 'ymca';
    } else if (hostname.includes('recreation') || hostname.includes('rec-center')) {
      category = 'recreation_center';
    } else if (hostname.includes('camp')) {
      category = 'private_camp';
    } else if (hostname.includes('sports') || hostname.includes('athletic')) {
      category = 'sports_facility';
    }

    return { hostname, platform, confidence, category };
  }

  private async analyzePartnershipOpportunity(url: string): Promise<SmartDetectionResult['partnership']> {
    const hostname = this.extractHostname(url);
    
    try {
      const { data, error } = await supabase
        .from('camp_provider_partnerships')
        .select('*')
        .eq('hostname', hostname)
        .maybeSingle();

      if (error || !data) {
        // Analyze potential for partnership
        const potential = await this.assessPartnershipPotential(hostname);
        return {
          status: 'potential',
          level: 'none',
          outreachRecommendation: potential.recommendation,
          expectedBenefits: potential.benefits
        };
      }

      return {
        status: data.status === 'active' ? 'partner' : 'neutral',
        level: (data.partnership_type as any) || 'bronze',
        expectedBenefits: ['Improved automation', 'Better success rates']
      };
    } catch (error) {
      return {
        status: 'neutral',
        level: 'none'
      };
    }
  }

  private async analyzeRealtimeConditions(url: string): Promise<SmartDetectionResult['realtime']> {
    const enhanced = await enhancedProviderIntelligence.analyzeProviderEnhanced(url);
    
    return {
      currentLoad: enhanced.realtimeMetrics.currentLoad,
      optimalTiming: this.calculateOptimalTiming(enhanced.realtimeMetrics),
      waitTime: enhanced.realtimeMetrics.averageWaitTime,
      queuePosition: enhanced.realtimeMetrics.queueDepth > 0 ? enhanced.realtimeMetrics.queueDepth : undefined
    };
  }

  private async analyzeAutomationStrategy(
    url: string, 
    context?: any
  ): Promise<SmartDetectionResult['automation']> {
    const enhanced = await enhancedProviderIntelligence.analyzeProviderEnhanced(url);
    
    let strategy: SmartDetectionResult['automation']['recommendedStrategy'] = 'manual_assist';
    let confidence = 0.5;
    let expectedSuccess = enhanced.metrics.successRate;
    let estimatedDuration = enhanced.realtimeMetrics.averageWaitTime;
    let riskLevel: 'low' | 'medium' | 'high' = 'medium';

    // Determine strategy based on partnership and capabilities
    if (enhanced.partnershipDetails.contractType === 'api') {
      strategy = 'api_first';
      confidence = 0.9;
      expectedSuccess *= 1.2;
      estimatedDuration *= 0.5;
      riskLevel = 'low';
    } else if (enhanced.partnershipDetails.contractType === 'hybrid') {
      strategy = 'hybrid';
      confidence = 0.8;
      expectedSuccess *= 1.1;
      riskLevel = 'low';
    } else if (enhanced.capabilities.formAutomation && enhanced.complianceStatus === 'green') {
      strategy = 'browser_optimized';
      confidence = 0.7;
      riskLevel = enhanced.relationshipStatus === 'partner' ? 'low' : 'medium';
    }

    // Adjust for urgency
    if (context?.urgencyLevel === 'high' && strategy === 'manual_assist') {
      strategy = 'browser_optimized';
      riskLevel = 'high';
    }

    return {
      recommendedStrategy: strategy,
      confidence: Math.min(0.95, confidence),
      expectedSuccess: Math.min(0.95, expectedSuccess),
      estimatedDuration: Math.max(1000, estimatedDuration),
      riskLevel
    };
  }

  private async assessPartnershipPotential(hostname: string): Promise<{
    recommendation: string;
    benefits: string[];
  }> {
    // Simple heuristics for partnership potential
    if (hostname.includes('ymca')) {
      return {
        recommendation: 'High potential - YMCA organizations often welcome automation partnerships',
        benefits: ['API integration opportunities', 'Bulk registration support', 'Reduced manual overhead']
      };
    }
    
    return {
      recommendation: 'Medium potential - Consider outreach for automation partnership',
      benefits: ['Improved success rates', 'Faster registrations', 'Better user experience']
    };
  }

  private calculateOptimalTiming(metrics: any): string {
    const currentHour = new Date().getHours();
    const peakHours = metrics.peakHours?.map((h: string) => parseInt(h)) || [];
    
    // Find next non-peak hour
    for (let i = 1; i <= 24; i++) {
      const nextHour = (currentHour + i) % 24;
      if (!peakHours.includes(nextHour)) {
        return `${nextHour.toString().padStart(2, '0')}:00`;
      }
    }
    
    return 'Now'; // Fallback
  }

  private calculateTimeSlotConfidence(hour: number, enhanced: any): number {
    let confidence = 0.8;
    
    // Business hours boost
    if (hour >= 9 && hour <= 17) {
      confidence += 0.1;
    }
    
    // Avoid peak hours
    if (enhanced.realtimeMetrics.peakHours.includes(hour.toString())) {
      confidence -= 0.3;
    }
    
    // Avoid maintenance
    if (enhanced.realtimeMetrics.maintenanceWindows.includes(hour.toString())) {
      confidence = 0;
    }
    
    return Math.max(0, Math.min(1, confidence));
  }

  private getCapabilityForAutomationType(automationType: string): string {
    const mapping: Record<string, string> = {
      'form_fill': 'formAutomation',
      'captcha': 'captchaPrevention', 
      'queue': 'queueManagement',
      'payment': 'paymentProcessing'
    };
    
    return mapping[automationType] || 'formAutomation';
  }

  private generateRecommendations(enhanced: any, probability: number): string[] {
    const recommendations = [];
    
    if (probability < 0.6) {
      recommendations.push('Consider manual registration or partnership outreach');
    }
    
    if (enhanced.realtimeMetrics.currentLoad > 0.8) {
      recommendations.push('Wait for lower load period or schedule for off-peak hours');
    }
    
    if (enhanced.complianceStatus === 'yellow') {
      recommendations.push('Use conservative automation settings and monitor closely');
    }
    
    if (enhanced.relationshipStatus === 'neutral') {
      recommendations.push('Consider partnership outreach to improve success rates');
    }
    
    return recommendations;
  }

  private estimateAutomationDuration(enhanced: any, automationType: string): {
    min: number; max: number; average: number;
  } {
    const baseTime = enhanced.realtimeMetrics.averageWaitTime;
    
    const typeMultipliers: Record<string, { min: number; max: number }> = {
      'form_fill': { min: 0.5, max: 1.5 },
      'payment': { min: 1.5, max: 3.0 },
      'captcha': { min: 2.0, max: 5.0 },
      'queue': { min: 3.0, max: 10.0 }
    };
    
    const multiplier = typeMultipliers[automationType] || { min: 1, max: 2 };
    
    return {
      min: baseTime * multiplier.min,
      max: baseTime * multiplier.max,
      average: baseTime * ((multiplier.min + multiplier.max) / 2)
    };
  }

  private async logDetectionResult(url: string, result: SmartDetectionResult): Promise<void> {
    try {
      // Use existing compliance_audit table for logging
      await supabase.from('compliance_audit').insert({
        session_id: 'detection-' + Date.now(),
        event_type: 'PROVIDER_DETECTION',
        event_data: {
          hostname: result.provider.hostname,
          platform: result.provider.platform,
          confidence: result.provider.confidence,
          strategy: result.automation.recommendedStrategy,
          partnership_status: result.partnership.status
        },
        payload_summary: `Smart detection: ${result.provider.platform} (${result.provider.confidence})`
      });
    } catch (error) {
      console.error('Failed to log detection result:', error);
    }
  }

  private extractHostname(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }
}

export const smartProviderDetection = new SmartProviderDetection();