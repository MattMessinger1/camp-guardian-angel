import { supabase } from '@/integrations/supabase/client';

// Utility functions for cleaning up bad database records
export const cleanupInvalidRegistrationPlans = async () => {
  try {
    console.log('🧹 Starting cleanup of invalid registration plans...');
    
    // Call the database function to clean up invalid plans
    const { data, error } = await supabase.rpc('cleanup_invalid_registration_plans');
    
    if (error) {
      console.error('Error during cleanup:', error);
      return { success: false, error };
    }
    
    const cleanupCount = data && data.length > 0 ? data[0].cleaned_count : 0;
    console.log(`✅ Cleanup complete: ${cleanupCount} invalid plans removed`);
    
    return { success: true, cleanupCount };
  } catch (error) {
    console.error('Cleanup failed:', error);
    return { success: false, error };
  }
};

// Function to validate session data integrity
export const validateSessionIntegrity = (result: any) => {
  const issues = [];
  
  // Check for Carbone with wrong URL
  if (result.businessName?.toLowerCase().includes('carbone') && 
      !result.url?.includes('resy')) {
    issues.push('Carbone result has incorrect URL');
  }
  
  // Check for Peloton with wrong URL
  if (result.businessName?.toLowerCase().includes('peloton') && 
      !result.url?.includes('peloton')) {
    issues.push('Peloton result has incorrect URL');
  }
  
  // Check for suspicious session IDs (reused from previous searches)
  if (result.id === '48453276-c3d5-4394-a44c-d21d11eafe57') {
    issues.push('Using known problematic session ID');
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
};

// Generate clean result data
export const generateCleanResultData = (result: any) => {
  const cleanResult = { ...result };
  
  // Always generate new unique ID
  cleanResult.id = crypto.randomUUID();
  
  // Clean up Carbone data
  if (cleanResult.businessName?.toLowerCase().includes('carbone') || 
      cleanResult.name?.toLowerCase().includes('carbone')) {
    cleanResult.businessName = 'Carbone';
    cleanResult.name = 'Carbone';
    cleanResult.url = 'https://resy.com/cities/ny/carbone';
    cleanResult.provider = 'resy';
  }
  
  // Clean up Peloton data
  else if (cleanResult.businessName?.toLowerCase().includes('peloton') || 
           cleanResult.name?.toLowerCase().includes('peloton') ||
           cleanResult.url?.includes('peloton')) {
    cleanResult.businessName = 'Peloton Studio';
    cleanResult.name = 'Peloton Studio';
    cleanResult.url = 'https://studio.onepeloton.com';
    cleanResult.provider = 'peloton';
  }
  
  // Add timestamp to prevent caching issues
  cleanResult.timestamp = Date.now();
  cleanResult.source = 'cleaned_search_result';
  
  return cleanResult;
};