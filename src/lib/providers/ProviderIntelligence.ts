/**
 * Provider Intelligence System
 * 
 * Analyzes camp providers for compliance status, automation capabilities,
 * and relationship status to enable intelligent automation rules.
 */

import { supabase } from '@/integrations/supabase/client';
import { detectPlatform } from './index';

export interface ProviderIntelligenceData {
  providerId?: string;
  hostname: string;
  complianceStatus: 'green' | 'yellow' | 'red';
  relationshipStatus: 'partner' | 'neutral' | 'restricted';
  
  // Automation capabilities
  automationRules: string[];
  capabilities: {
    formAutomation: boolean;
    captchaPrevention: boolean;
    queueManagement: boolean;
    paymentProcessing: boolean;
    sessionExtractionAccuracy: number; // 0-1
  };
  
  // Compliance and TOS info
  tosVersion?: string;
  tosLastUpdated?: string;
  complianceNotes: string[];
  riskFactors: string[];
  
  // Performance metrics
  metrics: {
    averageResponseTime: number;
    successRate: number;
    uptimePercentage: number;
    lastHealthCheck: string;
  };
  
  // Automation configuration
  config: {
    maxConcurrentSessions: number;
    retryAttempts: number;
    timeoutSeconds: number;
    useAggressivePolling: boolean;
    enablePreemptiveActions: boolean;
  };
  
  lastAnalyzed: string;
  confidenceScore: number; // 0-1
}

export interface AutomationRule {
  id: string;
  providerId: string;
  ruleType: 'form_fill' | 'timing' | 'captcha' | 'queue' | 'payment';
  condition: string;
  action: string;
  parameters: Record<string, any>;
  enabled: boolean;
  priority: number;
  successRate: number;
  lastUsed?: string;
  createdAt: string;
}

export class ProviderIntelligence {
  private intelligenceCache = new Map<string, ProviderIntelligenceData>();
  private rulesCache = new Map<string, AutomationRule[]>();

  /**
   * Analyze provider and return intelligence profile
   */
  async analyzeProvider(url: string): Promise<ProviderIntelligenceData> {
    const hostname = this.extractHostname(url);
    
    // Check cache first
    const cached = this.intelligenceCache.get(hostname);
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    console.log('Analyzing provider intelligence:', hostname);

    // Get basic provider profile
    const profile = await detectPlatform(url);
    
    // Load existing intelligence data
    const existing = await this.loadProviderIntelligence(hostname);
    
    if (existing) {
      // Update existing intelligence
      const updated = await this.updateIntelligence(existing, url);
      this.intelligenceCache.set(hostname, updated);
      return updated;
    }

    // Create new intelligence profile
    const intelligence = await this.createIntelligenceProfile(url, profile);
    await this.saveProviderIntelligence(intelligence);
    
    this.intelligenceCache.set(hostname, intelligence);
    return intelligence;
  }

  /**
   * Get automation rules for provider
   */
  async getAutomationRules(providerId: string): Promise<AutomationRule[]> {
    // Check cache
    const cached = this.rulesCache.get(providerId);
    if (cached) return cached;

    try {
      const { data, error } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('provider_hostname', providerId)
        .eq('enabled', true)
        .order('priority', { ascending: false });

      if (error) throw error;

      const rules = (data?.map(rule => ({
        id: rule.id,
        providerId: rule.provider_hostname,
        ruleType: rule.rule_type,
        condition: rule.condition,
        action: rule.action,
        priority: rule.priority,
        successRate: rule.success_rate,
        confidenceScore: rule.confidence_score,
        parameters: rule.parameters as Record<string, any>,
        enabled: rule.enabled,
        createdAt: rule.created_at,
        lastUsed: rule.last_used,
        lastUpdated: rule.last_updated
      })) as AutomationRule[]) || [];
      this.rulesCache.set(providerId, rules);
      return rules;
    } catch (error) {
      console.error('Failed to load automation rules:', error);
      return [];
    }
  }

  /**
   * Check if specific automation is allowed
   */
  async isAutomationAllowed(
    url: string, 
    automationType: 'form_fill' | 'captcha' | 'queue' | 'payment'
  ): Promise<{ allowed: boolean; reason?: string; confidence: number }> {
    const intelligence = await this.analyzeProvider(url);
    
    // Red compliance = no automation
    if (intelligence.complianceStatus === 'red') {
      return {
        allowed: false,
        reason: 'Provider marked as non-compliant',
        confidence: 1.0
      };
    }

    // Check specific capability
    const capability = this.getCapabilityForType(automationType);
    if (!intelligence.capabilities[capability]) {
      return {
        allowed: false,
        reason: `${automationType} automation not supported`,
        confidence: 0.8
      };
    }

    // Check relationship status
    if (intelligence.relationshipStatus === 'restricted') {
      return {
        allowed: false,
        reason: 'Provider relationship is restricted',
        confidence: 0.9
      };
    }

    // Partner providers get full automation
    if (intelligence.relationshipStatus === 'partner') {
      return {
        allowed: true,
        reason: 'Partner provider - full automation enabled',
        confidence: 1.0
      };
    }

    // Neutral providers with yellow compliance need careful handling
    if (intelligence.complianceStatus === 'yellow') {
      return {
        allowed: true,
        reason: 'Cautious automation allowed',
        confidence: 0.6
      };
    }

    return {
      allowed: true,
      reason: 'Standard automation allowed',
      confidence: 0.8
    };
  }

  /**
   * Get provider-specific configuration
   */
  async getProviderConfig(url: string): Promise<ProviderIntelligenceData['config']> {
    const intelligence = await this.analyzeProvider(url);
    return intelligence.config;
  }

  /**
   * Update provider metrics after automation attempt
   */
  async updateProviderMetrics(
    url: string,
    metrics: {
      responseTime?: number;
      success: boolean;
      errorType?: string;
      sessionDuration?: number;
    }
  ): Promise<void> {
    const hostname = this.extractHostname(url);
    const intelligence = this.intelligenceCache.get(hostname);
    
    if (!intelligence) return;

    // Update metrics
    if (metrics.responseTime) {
      intelligence.metrics.averageResponseTime = 
        (intelligence.metrics.averageResponseTime + metrics.responseTime) / 2;
    }

    // Update success rate (rolling average)
    const currentSuccessRate = intelligence.metrics.successRate;
    intelligence.metrics.successRate = 
      (currentSuccessRate * 0.9) + (metrics.success ? 0.1 : 0);

    intelligence.metrics.lastHealthCheck = new Date().toISOString();
    intelligence.lastAnalyzed = new Date().toISOString();

    // Adjust automation rules based on performance
    if (intelligence.metrics.successRate < 0.8) {
      intelligence.config.retryAttempts = Math.min(5, intelligence.config.retryAttempts + 1);
      intelligence.config.timeoutSeconds = Math.min(60, intelligence.config.timeoutSeconds + 5);
    } else if (intelligence.metrics.successRate > 0.95) {
      intelligence.config.enablePreemptiveActions = true;
      intelligence.config.useAggressivePolling = true;
    }

    await this.saveProviderIntelligence(intelligence);
  }

  /**
   * Learn from automation patterns and update rules
   */
  async learnFromSession(
    url: string,
    sessionData: {
      automationType: string;
      success: boolean;
      duration: number;
      steps: Array<{ action: string; success: boolean; timing: number }>;
      context: Record<string, any>;
    }
  ): Promise<void> {
    const hostname = this.extractHostname(url);
    
    // Analyze patterns and create/update rules
    const patterns = this.analyzeSessionPatterns(sessionData);
    
    for (const pattern of patterns) {
      await this.createOrUpdateRule(hostname, pattern);
    }

    console.log(`Learned ${patterns.length} patterns from session`);
  }

  // Private methods

  private async createIntelligenceProfile(
    url: string, 
    profile: any
    ): Promise<ProviderIntelligenceData> {
    const hostname = this.extractHostname(url);
    
    // Run compliance check
    const compliance = await this.checkCompliance(url);
    
    // Determine relationship status
    const relationshipStatus = await this.determineRelationshipStatus(hostname);
    
    // Get automation capabilities
    const capabilities = await this.assessCapabilities(url, profile);
    
    return {
      hostname,
      providerId: profile?.id,
      complianceStatus: compliance.status,
      relationshipStatus,
      automationRules: [],
      capabilities,
      tosVersion: compliance.tosVersion,
      tosLastUpdated: compliance.lastUpdated,
      complianceNotes: compliance.notes || [],
      riskFactors: compliance.risks || [],
      metrics: {
        averageResponseTime: 2000,
        successRate: 0.85,
        uptimePercentage: 0.99,
        lastHealthCheck: new Date().toISOString()
      },
      config: {
        maxConcurrentSessions: relationshipStatus === 'partner' ? 10 : 3,
        retryAttempts: 3,
        timeoutSeconds: 30,
        useAggressivePolling: relationshipStatus === 'partner',
        enablePreemptiveActions: relationshipStatus === 'partner'
      },
      lastAnalyzed: new Date().toISOString(),
      confidenceScore: compliance.confidence || 0.7
    };
  }

  private async updateIntelligence(
    existing: ProviderIntelligenceData, 
    url: string
  ): Promise<ProviderIntelligenceData> {
    // Re-check compliance if it's been more than 24 hours
    const lastCheck = new Date(existing.lastAnalyzed);
    const now = new Date();
    const hoursSinceCheck = (now.getTime() - lastCheck.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceCheck > 24) {
      const compliance = await this.checkCompliance(url);
      existing.complianceStatus = compliance.status;
      existing.tosVersion = compliance.tosVersion;
      existing.complianceNotes = compliance.notes || [];
      existing.lastAnalyzed = now.toISOString();
      
      await this.saveProviderIntelligence(existing);
    }
    
    return existing;
  }

  private async checkCompliance(url: string): Promise<{
    status: 'green' | 'yellow' | 'red';
    tosVersion?: string;
    lastUpdated?: string;
    notes?: string[];
    risks?: string[];
    confidence: number;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('simple-tos-check', {
        body: { url }
      });

      if (error) throw error;
      return {
        status: data.status,
        confidence: data.status === 'green' ? 0.9 : data.status === 'yellow' ? 0.6 : 0.1
      };
    } catch (error) {
      console.warn('Compliance check failed:', error);
      return {
        status: 'yellow',
        notes: ['Unable to verify compliance'],
        confidence: 0.3
      };
    }
  }

  private async determineRelationshipStatus(hostname: string): Promise<'partner' | 'neutral' | 'restricted'> {
    try {
      const { data, error } = await supabase
        .from('camp_provider_partnerships')
        .select('status')
        .eq('hostname', hostname)
        .maybeSingle();

      if (error) throw error;
      
      if (data?.status === 'active') return 'partner';
      if (data?.status === 'restricted') return 'restricted';
      return 'neutral';
    } catch (error) {
      console.warn('Failed to check partnership status:', error);
      return 'neutral';
    }
  }

  private async assessCapabilities(url: string, profile: any): Promise<ProviderIntelligenceData['capabilities']> {
    // Default capabilities based on platform
    const baseCapabilities = {
      formAutomation: true,
      captchaPrevention: false,
      queueManagement: false,
      paymentProcessing: false,
      sessionExtractionAccuracy: 0.7
    };

    // Enhanced capabilities for known platforms
    if (profile?.platform === 'jackrabbit_class') {
      baseCapabilities.captchaPrevention = true;
      baseCapabilities.queueManagement = true;
      baseCapabilities.sessionExtractionAccuracy = 0.9;
    }

    return baseCapabilities;
  }

  private async saveProviderIntelligence(intelligence: ProviderIntelligenceData): Promise<void> {
    try {
      const { error } = await supabase
        .from('provider_intelligence')
        .upsert({
          hostname: intelligence.hostname,
          provider_id: intelligence.providerId,
          intelligence_data: {
            capabilities: intelligence.capabilities,
            metrics: intelligence.metrics,
            complianceNotes: intelligence.complianceNotes,
            riskFactors: intelligence.riskFactors,
            config: intelligence.config,
            tosVersion: intelligence.tosVersion,
            tosLastUpdated: intelligence.tosLastUpdated
          },
          compliance_status: intelligence.complianceStatus,
          relationship_status: intelligence.relationshipStatus,
          confidence_score: intelligence.confidenceScore,
          last_analyzed: intelligence.lastAnalyzed
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to save provider intelligence:', error);
    }
  }

  private async loadProviderIntelligence(hostname: string): Promise<ProviderIntelligenceData | null> {
    try {
      const { data, error } = await supabase
        .from('provider_intelligence')
        .select('intelligence_data')
        .eq('hostname', hostname)
        .maybeSingle();

      if (error) throw error;
      return (data?.intelligence_data as unknown as ProviderIntelligenceData) || null;
    } catch (error) {
      console.error('Failed to load provider intelligence:', error);
      return null;
    }
  }

  private extractHostname(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }

  private isCacheValid(intelligence: ProviderIntelligenceData): boolean {
    const lastAnalyzed = new Date(intelligence.lastAnalyzed);
    const hoursSince = (Date.now() - lastAnalyzed.getTime()) / (1000 * 60 * 60);
    return hoursSince < 6; // Cache valid for 6 hours
  }

  private getCapabilityForType(automationType: string): keyof ProviderIntelligenceData['capabilities'] {
    switch (automationType) {
      case 'form_fill': return 'formAutomation';
      case 'captcha': return 'captchaPrevention';
      case 'queue': return 'queueManagement';
      case 'payment': return 'paymentProcessing';
      default: return 'formAutomation';
    }
  }

  private analyzeSessionPatterns(sessionData: any): Array<{
    ruleType: string;
    condition: string;
    action: string;
    parameters: Record<string, any>;
    confidence: number;
  }> {
    const patterns = [];
    
    // Analyze timing patterns
    const avgStepTime = sessionData.steps.reduce((sum: number, step: any) => sum + step.timing, 0) / sessionData.steps.length;
    if (avgStepTime > 2000) {
      patterns.push({
        ruleType: 'timing',
        condition: 'slow_response_detected',
        action: 'increase_timeout',
        parameters: { timeoutMs: avgStepTime * 1.5 },
        confidence: 0.8
      });
    }

    // Analyze failure patterns
    const failedSteps = sessionData.steps.filter((step: any) => !step.success);
    if (failedSteps.length > 0) {
      patterns.push({
        ruleType: 'form_fill',
        condition: 'step_failure_pattern',
        action: 'add_retry_logic',
        parameters: { 
          failedActions: failedSteps.map((s: any) => s.action),
          retryDelay: 1000
        },
        confidence: 0.7
      });
    }

    return patterns;
  }

  private async createOrUpdateRule(hostname: string, pattern: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('automation_rules')
        .upsert({
          provider_hostname: hostname,
          rule_type: pattern.ruleType,
          condition: pattern.condition,
          action: pattern.action,
          parameters: pattern.parameters,
          confidence_score: pattern.confidence,
          enabled: pattern.confidence > 0.7,
          priority: Math.floor(pattern.confidence * 10),
          last_updated: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to create automation rule:', error);
    }
  }
}

export const providerIntelligence = new ProviderIntelligence();