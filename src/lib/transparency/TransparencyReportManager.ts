/**
 * Day 6: Transparency Report Management System
 * 
 * Generates comprehensive transparency reports for:
 * - Parents: Activity summaries, privacy details, success rates
 * - Providers: Usage statistics, compliance metrics
 * - Public: System performance, ethical guidelines
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/log';

export interface TransparencyReport {
  id: string;
  report_type: 'parent_activity' | 'provider_interactions' | 'system_performance' | 'compliance_summary';
  user_id?: string;
  provider_hostname?: string;
  report_period_start: string;
  report_period_end: string;
  report_data: any;
  privacy_level: 'minimal' | 'standard' | 'detailed';
  access_token?: string;
  expires_at?: string;
  download_count: number;
}

export interface ReportGenerationOptions {
  report_type: string;
  user_id?: string;
  provider_hostname?: string;
  period_days: number;
  privacy_level?: 'minimal' | 'standard' | 'detailed';
  include_personal_data?: boolean;
}

export interface ParentActivitySummary {
  total_registrations: number;
  successful_registrations: number;
  success_rate: number;
  camps_attempted: string[];
  captcha_challenges: number;
  automation_assistance: number;
  privacy_protections_applied: string[];
  data_usage_summary: any;
}

export interface ProviderInteractionSummary {
  provider_name: string;
  total_user_attempts: number;
  success_rate: number;
  avg_processing_time: number;
  compliance_score: number;
  partnership_status: string;
  improvement_opportunities: string[];
}

export class TransparencyReportManager {
  private static instance: TransparencyReportManager;

  public static getInstance(): TransparencyReportManager {
    if (!TransparencyReportManager.instance) {
      TransparencyReportManager.instance = new TransparencyReportManager();
    }
    return TransparencyReportManager.instance;
  }

  /**
   * Generate comprehensive parent activity report
   */
  async generateParentReport(userId: string, options: ReportGenerationOptions): Promise<TransparencyReport | null> {
    try {
      logger.info('Generating parent transparency report', { userId, options });

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - (options.period_days || 30));

      // Use database function to generate report
      const { data: reportId, error } = await supabase
        .rpc('generate_transparency_report', {
          p_user_id: userId,
          p_report_type: 'parent_activity',
          p_start_date: startDate.toISOString(),
          p_end_date: endDate.toISOString()
        });

      if (error) throw error;

      // Fetch the generated report
      const { data: report, error: fetchError } = await supabase
        .from('transparency_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (fetchError) throw fetchError;

      // Enhance report with additional privacy-safe data
      const enhancedReport = await this.enhanceParentReport(report, options);

      logger.info('Parent transparency report generated', { reportId });
      return enhancedReport;

    } catch (error) {
      logger.error('Failed to generate parent report', { error, userId });
      return null;
    }
  }

  /**
   * Generate provider interaction summary report
   */
  async generateProviderReport(providerHostname: string, options: ReportGenerationOptions): Promise<TransparencyReport | null> {
    try {
      logger.info('Generating provider transparency report', { providerHostname, options });

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - (options.period_days || 30));

      // Collect provider interaction data
      const providerData = await this.collectProviderData(providerHostname, startDate, endDate);
      
      // Create report record
      const { data: report, error } = await supabase
        .from('transparency_reports')
        .insert({
          report_type: 'provider_interactions',
          provider_hostname: providerHostname,
          report_period_start: startDate.toISOString(),
          report_period_end: endDate.toISOString(),
          report_data: providerData,
          privacy_level: options.privacy_level || 'standard',
          access_token: this.generateAccessToken(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        })
        .select()
        .single();

      if (error) throw error;

      logger.info('Provider transparency report generated', { provider: providerHostname });
      return {
        ...report,
        report_type: report.report_type as 'parent_activity' | 'provider_interactions' | 'system_performance' | 'compliance_summary',
        privacy_level: report.privacy_level as 'minimal' | 'standard' | 'detailed'
      };

    } catch (error) {
      logger.error('Failed to generate provider report', { error, providerHostname });
      return null;
    }
  }

  /**
   * Generate public system performance report
   */
  async generatePublicReport(options: ReportGenerationOptions): Promise<TransparencyReport | null> {
    try {
      logger.info('Generating public transparency report', { options });

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - (options.period_days || 30));

      // Use database function for aggregated system data
      const { data: reportId, error } = await supabase
        .rpc('generate_transparency_report', {
          p_user_id: null,
          p_report_type: 'system_performance',
          p_start_date: startDate.toISOString(),
          p_end_date: endDate.toISOString()
        });

      if (error) throw error;

      // Fetch and enhance with public-safe metrics
      const { data: report, error: fetchError } = await supabase
        .from('transparency_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (fetchError) throw fetchError;

      // Add ethical guidelines and compliance information
      const enhancedReport = await this.enhancePublicReport(report);

      logger.info('Public transparency report generated', { reportId });
      return enhancedReport;

    } catch (error) {
      logger.error('Failed to generate public report', { error });
      return null;
    }
  }

  /**
   * Get all transparency reports for a user
   */
  async getUserReports(userId: string): Promise<TransparencyReport[]> {
    try {
      const { data: reports, error } = await supabase
        .from('transparency_reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return reports?.map(report => ({
        ...report,
        report_type: report.report_type as 'parent_activity' | 'provider_interactions' | 'system_performance' | 'compliance_summary',
        privacy_level: report.privacy_level as 'minimal' | 'standard' | 'detailed'
      })) || [];
    } catch (error) {
      logger.error('Failed to fetch user reports', { error, userId });
      return [];
    }
  }

  /**
   * Download report with access control
   */
  async downloadReport(reportId: string, accessToken?: string): Promise<{ success: boolean; report?: TransparencyReport; error?: string }> {
    try {
      let query = supabase
        .from('transparency_reports')
        .select('*')
        .eq('id', reportId);

      // Add access token verification if provided
      if (accessToken) {
        query = query.eq('access_token', accessToken);
      }

      const { data: report, error } = await query.single();

      if (error) throw error;

      if (!report) {
        return { success: false, error: 'Report not found or access denied' };
      }

      // Check expiration
      if (report.expires_at && new Date(report.expires_at) < new Date()) {
        return { success: false, error: 'Report access has expired' };
      }

      // Increment download count
      await supabase
        .from('transparency_reports')
        .update({ 
          download_count: report.download_count + 1,
          last_accessed_at: new Date().toISOString()
        })
        .eq('id', reportId);

      logger.info('Transparency report downloaded', { reportId });
      return { success: true, report: {
        ...report,
        report_type: report.report_type as 'parent_activity' | 'provider_interactions' | 'system_performance' | 'compliance_summary',
        privacy_level: report.privacy_level as 'minimal' | 'standard' | 'detailed'
      } };

    } catch (error) {
      logger.error('Failed to download report', { error, reportId });
      return { success: false, error: 'Download failed' };
    }
  }

  /**
   * Get transparency summary for dashboard
   */
  async getTransparencySummary(userId?: string): Promise<any> {
    try {
      const summary = {
        total_reports_generated: 0,
        parent_reports: 0,
        provider_reports: 0,
        public_reports: 0,
        total_downloads: 0,
        privacy_protections_active: [
          'Data minimization',
          'Automated PHI detection',
          'Secure token access',
          'Time-limited report access',
          'Privacy-level filtering'
        ],
        compliance_frameworks: [
          'COPPA compliance',
          'GDPR privacy rights', 
          'Ethical automation guidelines',
          'Camp provider terms respect'
        ]
      };

      let query = supabase
        .from('transparency_reports')
        .select('report_type, download_count');

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: reports, error } = await query;

      if (error) throw error;

      if (reports) {
        summary.total_reports_generated = reports.length;
        summary.parent_reports = reports.filter(r => r.report_type === 'parent_activity').length;
        summary.provider_reports = reports.filter(r => r.report_type === 'provider_interactions').length;
        summary.public_reports = reports.filter(r => r.report_type === 'system_performance').length;
        summary.total_downloads = reports.reduce((sum, r) => sum + r.download_count, 0);
      }

      return summary;
    } catch (error) {
      logger.error('Failed to get transparency summary', { error });
      return {};
    }
  }

  // Private helper methods

  private async enhanceParentReport(report: any, options: ReportGenerationOptions): Promise<TransparencyReport> {
    const enhancedData = {
      ...report.report_data,
      privacy_protections: [
        'Personal data anonymized',
        'Session details aggregated only',
        'No sharing with third parties',
        'Secure token-based access'
      ],
      automation_benefits: {
        time_saved_hours: Math.round(report.report_data.successful_registrations * 0.25), // Assume 15 mins saved per success
        stress_reduction_score: Math.min(report.report_data.successful_registrations * 10, 100),
        early_registration_advantages: report.report_data.successful_registrations
      },
      ethical_guidelines: [
        'Respectful of camp provider terms',
        'Human oversight on all critical actions',
        'Transparent about automation activities',
        'Parent control and consent required'
      ]
    };

    return {
      ...report,
      report_data: enhancedData
    };
  }

  private async collectProviderData(hostname: string, startDate: Date, endDate: Date): Promise<any> {
    // Collect aggregated, privacy-safe provider data
    const { data: registrations, error } = await supabase
      .from('registrations')
      .select(`
        status,
        requested_at,
        processed_at,
        sessions!inner(
          activity_id,
          activities!inner(
            canonical_url
          )
        )
      `)
      .gte('requested_at', startDate.toISOString())
      .lte('requested_at', endDate.toISOString());

    if (error) throw error;

    const providerRegistrations = registrations?.filter(r => {
      const url = r.sessions?.activities?.canonical_url;
      return url && new URL(url).hostname === hostname;
    }) || [];

    const totalAttempts = providerRegistrations.length;
    const successfulRegistrations = providerRegistrations.filter(r => r.status === 'accepted').length;
    const avgProcessingTime = providerRegistrations
      .filter(r => r.processed_at)
      .reduce((sum, r) => {
        const time = new Date(r.processed_at).getTime() - new Date(r.requested_at).getTime();
        return sum + time;
      }, 0) / Math.max(successfulRegistrations, 1) / 1000; // Convert to seconds

    return {
      provider_hostname: hostname,
      analysis_period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      total_registration_attempts: totalAttempts,
      successful_registrations: successfulRegistrations,
      success_rate: totalAttempts > 0 ? (successfulRegistrations / totalAttempts) * 100 : 0,
      avg_processing_time_seconds: Math.round(avgProcessingTime),
      ethical_practices: [
        'Respect for website terms of service',
        'Rate limiting to prevent server overload',
        'Human verification for complex scenarios',
        'Transparent automation disclosure'
      ],
      partnership_benefits: [
        'Reduced server load during peak times',
        'Improved user experience',
        'Better success rate analytics',
        'Direct integration opportunities'
      ]
    };
  }

  private async enhancePublicReport(report: any): Promise<TransparencyReport> {
    const enhancedData = {
      ...report.report_data,
      ethical_framework: {
        principles: [
          'Transparency: Full disclosure of automation activities',
          'Consent: Parent approval required for all actions',
          'Respect: Honor camp provider terms and policies',
          'Privacy: Minimal data collection and secure handling',
          'Fairness: Equal access and no preferential treatment'
        ],
        compliance_measures: [
          'Regular terms of service review',
          'Automated PHI detection and avoidance',
          'Rate limiting and respectful crawling',
          'Human oversight on critical decisions',
          'Partnership outreach for direct integration'
        ]
      },
      transparency_initiatives: [
        'Public performance metrics',
        'Open source compliance tools',
        'Regular transparency reports',
        'Community feedback channels',
        'External audits and reviews'
      ],
      improvement_commitments: [
        'Continuous success rate optimization',
        'Enhanced privacy protections',
        'Expanded provider partnerships',
        'Better parent communication',
        'Reduced manual intervention needs'
      ]
    };

    return {
      ...report,
      report_data: enhancedData
    };
  }

  private generateAccessToken(): string {
    return `tr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const transparencyReportManager = TransparencyReportManager.getInstance();