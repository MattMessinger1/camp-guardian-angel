/**
 * Compliance Dashboard Page
 * 
 * Main page for the compliance monitoring dashboard with navigation
 * and comprehensive oversight of automation ethics and compliance.
 */

import React from 'react';
import { ComplianceMonitoringDashboard } from '@/components/ComplianceMonitoringDashboard';
import { Layout } from '@/components/Layout';

export default function ComplianceDashboard() {
  return (
    <Layout>
      <ComplianceMonitoringDashboard />
    </Layout>
  );
}