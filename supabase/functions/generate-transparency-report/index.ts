import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TransparencyReportRequest {
  format: 'pdf' | 'csv';
  period: string;
  metrics: any;
  automationReports: any[];
  providerReports: any[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { format, period, metrics, automationReports, providerReports }: TransparencyReportRequest = await req.json();

    // Generate report data
    const reportData = {
      generated_at: new Date().toISOString(),
      period,
      metrics,
      automation_reports: automationReports,
      provider_reports: providerReports,
      summary: {
        total_registrations: metrics.totalRegistrations,
        success_rate: (metrics.successfulRegistrations / metrics.totalRegistrations * 100).toFixed(1),
        automation_usage: (metrics.automationUsageRate * 100).toFixed(1),
        compliance_score: (metrics.complianceScore * 100).toFixed(1),
        providers_tracked: metrics.providersTracked
      }
    };

    if (format === 'csv') {
      // Generate CSV format
      const csvRows = [
        ['Metric', 'Value'],
        ['Report Period', period],
        ['Total Registrations', metrics.totalRegistrations],
        ['Successful Registrations', metrics.successfulRegistrations],
        ['Success Rate (%)', (metrics.successfulRegistrations / metrics.totalRegistrations * 100).toFixed(1)],
        ['Automation Usage (%)', (metrics.automationUsageRate * 100).toFixed(1)],
        ['Average Response Time (ms)', metrics.averageResponseTime],
        ['Compliance Score (%)', (metrics.complianceScore * 100).toFixed(1)],
        ['Providers Tracked', metrics.providersTracked],
        ['Parent Notifications Sent', metrics.parentNotificationsSent],
        ['CAPTCHA Interventions', metrics.captchaInterventions],
        [''],
        ['Provider Partnership Status'],
        ['Hostname', 'Organization', 'Status', 'Automation Permitted', 'Compliance Score']
      ];

      providerReports.forEach(provider => {
        csvRows.push([
          provider.hostname,
          provider.organizationName || 'Unknown',
          provider.partnershipStatus,
          provider.automationPermitted ? 'Yes' : 'No',
          (provider.complianceScore * 100).toFixed(1) + '%'
        ]);
      });

      const csvContent = csvRows.map(row => row.join(',')).join('\n');

      return new Response(csvContent, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="transparency-report-${period}.csv"`
        }
      });
    }

    // For PDF format, return structured data (client can generate PDF)
    return new Response(JSON.stringify({
      success: true,
      report_data: reportData,
      download_url: `#`, // In real implementation, generate and store PDF
      message: 'Transparency report generated successfully'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error generating transparency report:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate transparency report',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});