/**
 * Day 6: Enhanced Partnership Management System
 * 
 * Manages camp provider partnerships and outreach:
 * - Automated partnership outreach
 * - Provider relationship tracking
 * - Success rate optimization
 * - Partnership value scoring
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/log';

export interface PartnershipOutreach {
  id: string;
  provider_hostname: string;
  provider_name?: string;
  contact_email?: string;
  outreach_status: 'pending' | 'contacted' | 'in_progress' | 'partnership_active' | 'declined' | 'no_response';
  outreach_type: 'api_integration' | 'partnership_agreement' | 'data_sharing' | 'compliance_review';
  priority_level: 'low' | 'medium' | 'high' | 'critical';
  success_rate: number;
  user_volume: number;
  partnership_value_score: number;
  last_contact_at?: string;
  next_followup_at?: string;
}

export interface PartnershipMetrics {
  total_partnerships: number;
  active_partnerships: number;
  success_rate_improvement: number;
  user_volume_covered: number;
  avg_response_time: number;
  conversion_rate: number;
}

export interface OutreachCampaign {
  target_providers: string[];
  campaign_type: 'initial_outreach' | 'follow_up' | 'partnership_renewal';
  message_template: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  expected_response_rate: number;
}

export class PartnershipManager {
  private static instance: PartnershipManager;

  public static getInstance(): PartnershipManager {
    if (!PartnershipManager.instance) {
      PartnershipManager.instance = new PartnershipManager();
    }
    return PartnershipManager.instance;
  }

  /**
   * Identify high-value providers for partnership outreach
   */
  async identifyPartnershipOpportunities(): Promise<PartnershipOutreach[]> {
    try {
      logger.info('Identifying partnership opportunities');

      // Get provider data from existing registrations and camp data
      const { data: providerData, error } = await supabase
        .from('registrations')
        .select(`
          session_id,
          status,
          sessions!inner(
            activity_id,
            activities!inner(
              provider_id,
              canonical_url
            )
          )
        `)
        .not('sessions.activities.canonical_url', 'is', null);

      if (error) throw error;

      // Analyze provider performance and volume
      const providerStats = this.analyzeProviderStats(providerData || []);
      
      // Score and prioritize providers
      const opportunities = await this.scoreProviders(providerStats);

      logger.info('Partnership opportunities identified', { count: opportunities.length });
      return opportunities;

    } catch (error) {
      logger.error('Failed to identify partnership opportunities', { error });
      return [];
    }
  }

  /**
   * Launch automated outreach campaign
   */
  async launchOutreachCampaign(campaign: OutreachCampaign): Promise<{ success: boolean; campaign_id?: string }> {
    try {
      logger.info('Launching partnership outreach campaign', { campaign });

      const results = await Promise.allSettled(
        campaign.target_providers.map(hostname => 
          this.initiateProviderOutreach(hostname, campaign)
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const success_rate = successful / results.length;

      logger.info('Outreach campaign completed', { 
        total: results.length, 
        successful, 
        success_rate 
      });

      return {
        success: success_rate > 0.5,
        campaign_id: `camp_${Date.now()}`
      };

    } catch (error) {
      logger.error('Outreach campaign failed', { error, campaign });
      return { success: false };
    }
  }

  /**
   * Get partnership performance metrics
   */
  async getPartnershipMetrics(timeRange: '7d' | '30d' | '90d' = '30d'): Promise<PartnershipMetrics> {
    try {
      const startDate = new Date();
      const days = { '7d': 7, '30d': 30, '90d': 90 }[timeRange];
      startDate.setDate(startDate.getDate() - days);

      const { data: partnerships, error } = await supabase
        .from('partnership_outreach')
        .select('*')
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      const metrics = this.calculatePartnershipMetrics(partnerships || []);
      
      logger.info('Partnership metrics calculated', { metrics, timeRange });
      return metrics;

    } catch (error) {
      logger.error('Failed to get partnership metrics', { error });
      return {
        total_partnerships: 0,
        active_partnerships: 0,
        success_rate_improvement: 0,
        user_volume_covered: 0,
        avg_response_time: 0,
        conversion_rate: 0
      };
    }
  }

  /**
   * Update partnership status and track progress
   */
  async updatePartnershipStatus(
    partnershipId: string, 
    status: string, 
    notes?: string
  ): Promise<boolean> {
    try {
      const updateData: any = {
        outreach_status: status,
        updated_at: new Date().toISOString()
      };

      if (status === 'contacted') {
        updateData.last_contact_at = new Date().toISOString();
        // Increment outreach_attempts - we'll do this in a separate update
      }

      if (status === 'partnership_active') {
        updateData.response_received = true;
      }

      const { error } = await supabase
        .from('partnership_outreach')
        .update(updateData)
        .eq('id', partnershipId);

      if (error) throw error;

      // Log communication if notes provided
      if (notes) {
        await this.logProviderCommunication(partnershipId, 'status_update', notes);
      }

      logger.info('Partnership status updated', { partnershipId, status });
      return true;

    } catch (error) {
      logger.error('Failed to update partnership status', { error, partnershipId, status });
      return false;
    }
  }

  /**
   * Generate partnership outreach email content
   */
  generateOutreachEmail(provider: PartnershipOutreach): { subject: string; content: string } {
    const templates = {
      api_integration: {
        subject: `Partnership Opportunity: Streamlined Registration Integration for ${provider.provider_name || provider.provider_hostname}`,
        content: `Dear ${provider.provider_name || provider.provider_hostname} Team,

I hope this message finds you well. We're reaching out regarding a partnership opportunity that could benefit your camp registration process and our mutual families.

Our automated registration system has been helping families successfully register for ${provider.provider_name || 'your programs'}, and we'd love to explore a more direct integration that could:

✅ Reduce server load during peak registration times  
✅ Provide better success rates for families
✅ Offer real-time registration insights
✅ Ensure compliance with your terms of service

We've observed ${provider.user_volume} families attempting to register for your programs with a ${(provider.success_rate * 100).toFixed(1)}% success rate. A direct partnership could improve this significantly.

Would you be open to a brief 15-minute call to explore how we might work together to enhance the registration experience?

Best regards,
Partnership Team

P.S. We're committed to transparency and ethical automation practices. Happy to share our compliance framework and success metrics.`
      },
      partnership_agreement: {
        subject: `Formal Partnership Proposal: Enhanced Registration Services`,
        content: `Dear Partnership Team,

Following our initial discussion, we'd like to propose a formal partnership agreement that creates value for both our organizations and the families we serve.

Partnership Benefits:
• Direct API integration for seamless registrations
• Reduced technical load on your infrastructure  
• Enhanced success rates and user experience
• Shared analytics and insights
• Priority support and compliance monitoring

Our Commitment:
• Full transparency in our automation processes
• Strict adherence to your terms of service
• Regular performance reporting
• Dedicated partnership support

Next Steps:
We've prepared a partnership framework document that outlines the technical integration, legal considerations, and mutual benefits. Would you like to schedule a call to review this proposal?

Looking forward to building a successful partnership together.

Best regards,
Partnership Development Team`
      }
    };

    return templates[provider.outreach_type] || templates.api_integration;
  }

  // Private helper methods

  private analyzeProviderStats(registrationData: any[]): Record<string, any> {
    const stats = {};

    registrationData.forEach(reg => {
      const url = reg.sessions?.activities?.canonical_url;
      if (!url) return;

      const hostname = new URL(url).hostname;
      if (!stats[hostname]) {
        stats[hostname] = {
          hostname,
          total_attempts: 0,
          successful_registrations: 0,
          user_volume: new Set()
        };
      }

      stats[hostname].total_attempts++;
      if (reg.status === 'accepted') {
        stats[hostname].successful_registrations++;
      }
      stats[hostname].user_volume.add(reg.user_id);
    });

    // Convert Sets to counts and calculate success rates
    Object.values(stats).forEach((stat: any) => {
      stat.user_volume = stat.user_volume.size;
      stat.success_rate = stat.total_attempts > 0 ? 
        stat.successful_registrations / stat.total_attempts : 0;
    });

    return stats;
  }

  private async scoreProviders(providerStats: Record<string, any>): Promise<PartnershipOutreach[]> {
    const opportunities = [];

    for (const [hostname, stats] of Object.entries(providerStats)) {
      const stat = stats as any;
      
      // Calculate partnership value score
      const volumeScore = Math.min(stat.user_volume / 100, 1) * 40; // Up to 40 points for volume
      const successScore = (1 - stat.success_rate) * 40; // Up to 40 points for low success rate (improvement opportunity)  
      const consistencyScore = stat.total_attempts > 10 ? 20 : stat.total_attempts; // Up to 20 points for consistency

      const partnership_value_score = volumeScore + successScore + consistencyScore;

      // Determine priority level
      const priority_level = await supabase
        .rpc('calculate_partnership_priority', {
          p_hostname: hostname,
          p_user_volume: stat.user_volume,
          p_success_rate: stat.success_rate
        });

      opportunities.push({
        id: '', // Will be generated on insert
        provider_hostname: hostname,
        provider_name: this.extractProviderName(hostname),
        outreach_status: 'pending' as const,
        outreach_type: 'api_integration' as const,
        priority_level: priority_level.data || 'medium',
        success_rate: stat.success_rate,
        user_volume: stat.user_volume,
        partnership_value_score
      });
    }

    // Sort by partnership value score (highest first)
    return opportunities.sort((a, b) => b.partnership_value_score - a.partnership_value_score);
  }

  private async initiateProviderOutreach(hostname: string, campaign: OutreachCampaign): Promise<boolean> {
    try {
      // Check if outreach already exists
      const { data: existing } = await supabase
        .from('partnership_outreach')
        .select('id')
        .eq('provider_hostname', hostname)
        .single();

      if (existing) {
        logger.info('Outreach already exists for provider', { hostname });
        return true;
      }

      // Create new outreach record
      const { error } = await supabase
        .from('partnership_outreach')
        .insert({
          provider_hostname: hostname,
          provider_name: this.extractProviderName(hostname),
          outreach_status: 'pending',
          outreach_type: campaign.campaign_type === 'initial_outreach' ? 'api_integration' : 'partnership_agreement',
          priority_level: campaign.priority,
          next_followup_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
        });

      if (error) throw error;

      // Log the outreach initiation
      await this.logProviderCommunication(hostname, 'outreach_email', campaign.message_template);

      return true;
    } catch (error) {
      logger.error('Failed to initiate provider outreach', { error, hostname });
      return false;
    }
  }

  private calculatePartnershipMetrics(partnerships: any[]): PartnershipMetrics {
    const total = partnerships.length;
    const active = partnerships.filter(p => p.outreach_status === 'partnership_active').length;
    const responded = partnerships.filter(p => p.response_received).length;

    return {
      total_partnerships: total,
      active_partnerships: active,
      success_rate_improvement: active > 0 ? (active / total) * 100 : 0,
      user_volume_covered: partnerships.reduce((sum, p) => sum + (p.user_volume || 0), 0),
      avg_response_time: 2.5, // Average days - could be calculated from actual data
      conversion_rate: total > 0 ? (responded / total) * 100 : 0
    };
  }

  private async logProviderCommunication(partnershipId: string, type: string, content: string): Promise<void> {
    try {
      await supabase
        .from('provider_communications')
        .insert({
          provider_hostname: partnershipId,
          communication_type: type,
          direction: 'outbound',
          contact_method: 'email',
          message_content: content,
          status: 'sent'
        });
    } catch (error) {
      logger.error('Failed to log provider communication', { error });
    }
  }

  private extractProviderName(hostname: string): string {
    // Extract a human readable name from hostname
    return hostname
      .replace(/^www\./, '')
      .replace(/\.(com|org|net|edu)$/, '')
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}

export const partnershipManager = PartnershipManager.getInstance();