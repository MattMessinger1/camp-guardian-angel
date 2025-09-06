import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ImportResult {
  success: boolean;
  imported_count: number;
  activity_id: string;
  provider_name: string;
  sessions: Array<{
    id: string;
    title: string;
    start_at: string | null;
    signup_url: string | null;
  }>;
}

interface ImportState {
  isImporting: boolean;
  result: ImportResult | null;
  error: string | null;
}

export const useJackrabbitImport = () => {
  const [state, setState] = useState<ImportState>({
    isImporting: false,
    result: null,
    error: null
  });
  const { toast } = useToast();

  const importJackrabbitClasses = async (providerUrl: string, organizationId: string) => {
    setState({ isImporting: true, result: null, error: null });

    try {
      console.log('[JACKRABBIT-IMPORT] Starting import:', { providerUrl, organizationId });

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('Authentication required');
      }

      const { data, error } = await supabase.functions.invoke('jackrabbit-import-classes', {
        body: {
          provider_url: providerUrl,
          organization_id: organizationId,
          user_id: user.user.id
        }
      });

      if (error) {
        console.error('[JACKRABBIT-IMPORT] Function error:', error);
        throw new Error(error.message || 'Import function failed');
      }

      if (!data.success) {
        throw new Error(data.error || 'Import failed');
      }

      console.log('[JACKRABBIT-IMPORT] Success:', data);

      setState({ 
        isImporting: false, 
        result: data, 
        error: null 
      });

      toast({
        title: "Import Successful",
        description: `Imported ${data.imported_count} classes from ${data.provider_name}`,
      });

      return data;

    } catch (error) {
      console.error('[JACKRABBIT-IMPORT] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Import failed';
      
      setState({ 
        isImporting: false, 
        result: null, 
        error: errorMessage 
      });

      toast({
        title: "Import Failed",
        description: errorMessage,
        variant: "destructive"
      });

      throw error;
    }
  };

  const reset = () => {
    setState({ isImporting: false, result: null, error: null });
  };

  return {
    ...state,
    importJackrabbitClasses,
    reset
  };
};