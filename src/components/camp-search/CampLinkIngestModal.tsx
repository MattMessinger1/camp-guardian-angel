import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CampLinkIngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (campName: string) => void;
}

export const CampLinkIngestModal: React.FC<CampLinkIngestModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    campName: '',
    city: '',
    state: '',
    zip: '',
    sourceUrl: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to add camp sources.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.sourceUrl.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a camp listing URL.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('Calling ingest-camp-source...');
      
      // Call ingest-camp-source edge function
      const { data: ingestData, error: ingestError } = await supabase.functions.invoke('ingest-camp-source', {
        body: {
          user_id: user.id,
          camp_name: formData.campName.trim() || undefined,
          location_hint: (formData.city || formData.state || formData.zip) ? {
            city: formData.city.trim() || undefined,
            state: formData.state.trim() || undefined,
            zip: formData.zip.trim() || undefined,
          } : undefined,
          source_url: formData.sourceUrl.trim(),
        }
      });

      if (ingestError) {
        throw new Error(ingestError.message);
      }

      if (!ingestData?.success) {
        throw new Error(ingestData?.error || 'Failed to ingest camp source');
      }

      console.log('Ingest successful:', ingestData);

      // Call refresh-session-index to update embeddings
      console.log('Refreshing session index...');
      const { error: refreshError } = await supabase.functions.invoke('refresh-session-index', {
        body: {}
      });

      if (refreshError) {
        console.warn('Refresh failed but continuing:', refreshError);
      }

      toast({
        title: "Success!",
        description: `Added ${ingestData.sessionsUpserted || 0} sessions from ${ingestData.provider || 'source'}`,
      });

      // Reset form and close modal
      setFormData({
        campName: '',
        city: '',
        state: '',
        zip: '',
        sourceUrl: ''
      });

      // Pass camp name to trigger search
      const campNameForSearch = formData.campName.trim() || 'new camp';
      onSuccess(campNameForSearch);

    } catch (error) {
      console.error('Error ingesting camp source:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to add camp source',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Add Camp Source
          </DialogTitle>
          <DialogDescription>
            Paste a link to a camp's public registration page to add their sessions to our database.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sourceUrl">Camp Registration URL *</Label>
            <Input
              id="sourceUrl"
              type="url"
              value={formData.sourceUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, sourceUrl: e.target.value }))}
              placeholder="https://example.com/summer-camps"
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="campName">Camp Name (optional)</Label>
            <Input
              id="campName"
              value={formData.campName}
              onChange={(e) => setFormData(prev => ({ ...prev, campName: e.target.value }))}
              placeholder="e.g., Camp Wildwood"
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="city">City (optional)</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                placeholder="Austin"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State (optional)</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                placeholder="TX"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="zip">ZIP Code (optional)</Label>
            <Input
              id="zip"
              value={formData.zip}
              onChange={(e) => setFormData(prev => ({ ...prev, zip: e.target.value }))}
              placeholder="78701"
              disabled={isLoading}
            />
          </div>

          <DialogFooter className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                'Add Camp Source'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};