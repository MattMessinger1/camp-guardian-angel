import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Building2, 
  Plus, 
  Edit, 
  Calendar, 
  Mail, 
  ExternalLink, 
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle
} from 'lucide-react';

interface Partnership {
  id: string;
  hostname: string;
  organization_name: string | null;
  status: 'partner' | 'approved' | 'pending' | 'rejected' | 'unknown';
  partnership_type: 'official_api' | 'approved_automation' | 'manual_only' | null;
  api_endpoint: string | null;
  contact_email: string | null;
  last_contact: string | null;
  notes: string | null;
  confidence_score: number;
  created_at: string;
  updated_at: string;
}

interface PartnershipFormData {
  hostname: string;
  organizationName: string;
  status: string;
  partnershipType: string;
  apiEndpoint: string;
  contactEmail: string;
  lastContact: string;
  notes: string;
  confidenceScore: number;
}

export function PartnershipManager() {
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPartnership, setEditingPartnership] = useState<Partnership | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState<PartnershipFormData>({
    hostname: '',
    organizationName: '',
    status: 'unknown',
    partnershipType: '',
    apiEndpoint: '',
    contactEmail: '',
    lastContact: '',
    notes: '',
    confidenceScore: 0.8
  });

  useEffect(() => {
    loadPartnerships();
  }, []);

  const loadPartnerships = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('camp_provider_partnerships')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setPartnerships(data as Partnership[] || []);
    } catch (error: any) {
      toast({
        title: "Failed to load partnerships",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.hostname.trim()) {
      toast({
        title: "Hostname required",
        description: "Please enter a hostname for the partnership",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('tos-monitor', {
        body: {
          action: 'update_partnership',
          hostname: formData.hostname,
          partnershipData: {
            organizationName: formData.organizationName,
            status: formData.status,
            partnershipType: formData.partnershipType || null,
            apiEndpoint: formData.apiEndpoint || null,
            contactEmail: formData.contactEmail || null,
            lastContact: formData.lastContact || null,
            notes: formData.notes || null,
            confidenceScore: formData.confidenceScore
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Partnership updated",
        description: `Successfully updated partnership for ${formData.hostname}`,
      });

      setDialogOpen(false);
      resetForm();
      loadPartnerships();

    } catch (error: any) {
      toast({
        title: "Failed to update partnership",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      hostname: '',
      organizationName: '',
      status: 'unknown',
      partnershipType: '',
      apiEndpoint: '',
      contactEmail: '',
      lastContact: '',
      notes: '',
      confidenceScore: 0.8
    });
    setEditingPartnership(null);
  };

  const handleEdit = (partnership: Partnership) => {
    setFormData({
      hostname: partnership.hostname,
      organizationName: partnership.organization_name || '',
      status: partnership.status,
      partnershipType: partnership.partnership_type || '',
      apiEndpoint: partnership.api_endpoint || '',
      contactEmail: partnership.contact_email || '',
      lastContact: partnership.last_contact ? partnership.last_contact.split('T')[0] : '',
      notes: partnership.notes || '',
      confidenceScore: partnership.confidence_score
    });
    setEditingPartnership(partnership);
    setDialogOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'partner':
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      partner: 'default',
      approved: 'default',
      pending: 'secondary',
      rejected: 'destructive',
      unknown: 'outline'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Camp Provider Partnerships
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Partnership
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingPartnership ? 'Edit Partnership' : 'Add New Partnership'}
                </DialogTitle>
                <DialogDescription>
                  Manage camp provider partnership information for TOS compliance tracking
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="hostname">Hostname *</Label>
                  <Input
                    id="hostname"
                    placeholder="e.g., active.com"
                    value={formData.hostname}
                    onChange={(e) => setFormData({...formData, hostname: e.target.value})}
                    disabled={!!editingPartnership}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organizationName">Organization Name</Label>
                  <Input
                    id="organizationName"
                    placeholder="e.g., Active Network"
                    value={formData.organizationName}
                    onChange={(e) => setFormData({...formData, organizationName: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Partnership Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unknown">Unknown</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="partner">Official Partner</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="partnershipType">Partnership Type</Label>
                  <Select value={formData.partnershipType} onValueChange={(value) => setFormData({...formData, partnershipType: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      <SelectItem value="official_api">Official API</SelectItem>
                      <SelectItem value="approved_automation">Approved Automation</SelectItem>
                      <SelectItem value="manual_only">Manual Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiEndpoint">API Endpoint</Label>
                  <Input
                    id="apiEndpoint"
                    placeholder="https://api.example.com"
                    value={formData.apiEndpoint}
                    onChange={(e) => setFormData({...formData, apiEndpoint: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="partner@example.com"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastContact">Last Contact Date</Label>
                  <Input
                    id="lastContact"
                    type="date"
                    value={formData.lastContact}
                    onChange={(e) => setFormData({...formData, lastContact: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confidenceScore">Confidence Score</Label>
                  <Input
                    id="confidenceScore"
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={formData.confidenceScore}
                    onChange={(e) => setFormData({...formData, confidenceScore: parseFloat(e.target.value) || 0})}
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Partnership notes, communication history, etc."
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {editingPartnership ? 'Update' : 'Create'} Partnership
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
        <CardDescription>
          Track and manage relationships with camp providers for compliance and automation permissions
        </CardDescription>
      </CardHeader>

      <CardContent>
        {loading && partnerships.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading partnerships...
          </div>
        ) : partnerships.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No partnerships found. Add your first camp provider partnership.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partnerships.map((partnership) => (
                <TableRow key={partnership.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {partnership.organization_name || 'Unknown Organization'}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />
                        {partnership.hostname}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(partnership.status)}
                      {getStatusBadge(partnership.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {partnership.partnership_type ? (
                      <Badge variant="outline">
                        {partnership.partnership_type.replace('_', ' ')}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {partnership.contact_email ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3" />
                        {partnership.contact_email}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {Math.round(partnership.confidence_score * 100)}%
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(partnership.updated_at).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(partnership)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}