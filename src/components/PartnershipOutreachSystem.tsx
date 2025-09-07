import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, 
  Building2, 
  Mail, 
  Calendar, 
  Plus, 
  Eye, 
  Edit, 
  Loader2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Settings,
  Handshake
} from 'lucide-react';

interface OutreachCampaign {
  id: string;
  hostname: string;
  organization_name: string | null;
  status: 'pending' | 'sent' | 'replied' | 'partnership' | 'declined';
  email_template: string;
  sent_at: string | null;
  last_follow_up: string | null;
  follow_up_count: number;
  response_received: boolean;
  api_interest: boolean;
  notes: string | null;
  created_at: string;
}

interface EmailTemplate {
  name: string;
  subject: string;
  body: string;
  type: 'initial' | 'follow_up' | 'api_offer' | 'partnership';
}

const defaultTemplates: EmailTemplate[] = [
  {
    name: 'Initial Partnership Inquiry',
    subject: 'Partnership Opportunity - CampGenie Automated Registration Service',
    type: 'initial',
    body: `Dear {{organization_name}} Team,

I hope this email finds you well. My name is [Your Name] from CampGenie, and I'm reaching out to discuss a potential partnership opportunity that could benefit both our organizations.

CampGenie helps parents find and register for camps through our automated platform. We've identified {{organization_name}} as a provider that could benefit from increased enrollment visibility and streamlined registration processes.

**What we offer:**
- Increased enrollment through our parent network
- Respectful automation that follows your terms of service
- Optional API integration for seamless data exchange
- Revenue sharing opportunities for official partners

**Our approach:**
- We strictly follow robots.txt and rate limiting
- All complex scenarios involve human oversight
- We maintain full compliance with your terms of service
- We provide transparent reporting on all activities

We'd love to schedule a brief call to discuss how a partnership could work for {{organization_name}}. Are you available for a 15-minute conversation this week?

Best regards,
[Your Name]
CampGenie Partnership Team
partnerships@campgenie.com
`
  },
  {
    name: 'API Integration Offer',
    subject: 'API Partnership - Streamline Camp Registrations',
    type: 'api_offer',
    body: `Hello {{organization_name}},

Following up on our previous conversation, I wanted to share more details about our API integration opportunities.

**Benefits of API Partnership:**
- Direct integration eliminates screen scraping
- Real-time availability updates
- Reduced server load on your systems
- Priority support for technical issues
- Revenue sharing up to 15% on referred registrations

**Technical Details:**
- RESTful API with full documentation
- Webhook support for real-time updates
- Sandbox environment for testing
- Dedicated technical support

We can provide a demo environment within 48 hours. Would you be interested in seeing our API documentation and discussing implementation timelines?

Best regards,
[Your Name]
Technical Partnerships
api@campgenie.com
`
  },
  {
    name: 'Follow-up Email',
    subject: 'Re: Partnership Opportunity - CampGenie',
    type: 'follow_up',
    body: `Hi {{organization_name}},

I wanted to follow up on my previous email about partnership opportunities between CampGenie and {{organization_name}}.

I understand you're likely busy with the registration season, but I believe this partnership could provide significant value:

- Increase your camp enrollments
- Reduce manual registration overhead
- Provide better parent experience

If now isn't the right time, I'd be happy to reconnect at a more convenient time. Would early [next month] work better for a brief conversation?

Thanks for your time!

Best regards,
[Your Name]
CampGenie Partnership Team
`
  }
];

export function PartnershipOutreachSystem() {
  const [campaigns, setCampaigns] = useState<OutreachCampaign[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>(defaultTemplates);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<OutreachCampaign | null>(null);
  const { toast } = useToast();

  const [newCampaign, setNewCampaign] = useState({
    hostname: '',
    organizationName: '',
    contactEmail: '',
    selectedTemplate: '',
    customMessage: '',
    apiInterest: false
  });

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      // Mock data for now - in real implementation, this would come from a dedicated table
      const mockCampaigns: OutreachCampaign[] = [
        {
          id: '1',
          hostname: 'active.com',
          organization_name: 'Active Network',
          status: 'replied',
          email_template: 'initial',
          sent_at: '2024-01-15T10:00:00Z',
          last_follow_up: null,
          follow_up_count: 0,
          response_received: true,
          api_interest: true,
          notes: 'Expressed interest in API integration. Scheduled call for next week.',
          created_at: '2024-01-10T09:00:00Z'
        },
        {
          id: '2',
          hostname: 'campmanagement.com',
          organization_name: 'CampBrain',
          status: 'sent',
          email_template: 'initial',
          sent_at: '2024-01-12T14:30:00Z',
          last_follow_up: null,
          follow_up_count: 0,
          response_received: false,
          api_interest: false,
          notes: null,
          created_at: '2024-01-12T14:00:00Z'
        }
      ];
      setCampaigns(mockCampaigns);
    } catch (error: any) {
      toast({
        title: 'Failed to load campaigns',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const prepareOutreach = async () => {
    if (!newCampaign.hostname || !newCampaign.contactEmail || !newCampaign.selectedTemplate) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in hostname, contact email, and select a template.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const template = templates.find(t => t.name === newCampaign.selectedTemplate);
      if (!template) throw new Error('Template not found');

      const personalizedBody = template.body
        .replace(/{{organization_name}}/g, newCampaign.organizationName || newCampaign.hostname)
        .replace(/{{hostname}}/g, newCampaign.hostname);

      const emailContent = newCampaign.customMessage || personalizedBody;

      // Create campaign record for tracking (but don't send email)
      const newCampaignRecord: OutreachCampaign = {
        id: Date.now().toString(),
        hostname: newCampaign.hostname,
        organization_name: newCampaign.organizationName || null,
        status: 'pending', // Changed from 'sent' to 'pending'
        email_template: template.type,
        sent_at: null, // Not sent yet
        last_follow_up: null,
        follow_up_count: 0,
        response_received: false,
        api_interest: newCampaign.apiInterest,
        notes: 'Email prepared for manual sending', // Add note about manual process
        created_at: new Date().toISOString()
      };

      setCampaigns([newCampaignRecord, ...campaigns]);

      // Show the prepared email content to user
      const emailDetails = {
        to: newCampaign.contactEmail,
        subject: template.subject,
        body: emailContent
      };

      toast({
        title: 'Outreach email prepared',
        description: `Email ready for manual sending to ${newCampaign.contactEmail}. Check the campaign details to copy the email content.`
      });

      // Store the prepared email content in the campaign for manual copying
      setSelectedCampaign({
        ...newCampaignRecord,
        notes: `PREPARED EMAIL:\n\nTo: ${emailDetails.to}\nSubject: ${emailDetails.subject}\n\nBody:\n${emailDetails.body}`
      });

      setDialogOpen(false);
      setNewCampaign({
        hostname: '',
        organizationName: '',
        contactEmail: '',
        selectedTemplate: '',
        customMessage: '',
        apiInterest: false
      });

    } catch (error: any) {
      toast({
        title: 'Failed to prepare outreach',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const prepareFollowUp = async (campaign: OutreachCampaign) => {
    setLoading(true);
    try {
      const followUpTemplate = templates.find(t => t.type === 'follow_up');
      if (!followUpTemplate) throw new Error('Follow-up template not found');

      const personalizedBody = followUpTemplate.body
        .replace(/{{organization_name}}/g, campaign.organization_name || campaign.hostname);

      // Prepare follow-up email content for manual sending
      const followUpContent = {
        to: `contact@${campaign.hostname}`, // In real implementation, store contact email
        subject: followUpTemplate.subject,
        body: personalizedBody
      };

      // Update campaign to show follow-up is prepared
      const updatedCampaigns = campaigns.map(c => 
        c.id === campaign.id 
          ? { 
              ...c, 
              notes: `FOLLOW-UP EMAIL PREPARED:\n\nTo: ${followUpContent.to}\nSubject: ${followUpContent.subject}\n\nBody:\n${followUpContent.body}`,
              follow_up_count: c.follow_up_count + 1
            }
          : c
      );
      setCampaigns(updatedCampaigns);

      toast({
        title: 'Follow-up email prepared',
        description: `Follow-up email ready for manual sending to ${campaign.hostname}. Check campaign notes for email content.`
      });

    } catch (error: any) {
      toast({
        title: 'Failed to prepare follow-up',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'partnership':
        return <Handshake className="h-4 w-4 text-green-500" />;
      case 'replied':
        return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
      case 'sent':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'declined':
        return <ExternalLink className="h-4 w-4 text-red-500" />;
      default:
        return <Mail className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      partnership: 'default',
      replied: 'secondary',
      sent: 'outline',
      declined: 'destructive',
      pending: 'outline'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Partnership Outreach</h2>
          <p className="text-muted-foreground">
            Manage outreach campaigns and API partnership offers to camp providers
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Outreach
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Outreach Campaign</DialogTitle>
              <DialogDescription>
                Send partnership inquiries and API integration offers to camp providers
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="hostname">Hostname *</Label>
                <Input
                  id="hostname"
                  placeholder="e.g., active.com"
                  value={newCampaign.hostname}
                  onChange={(e) => setNewCampaign({...newCampaign, hostname: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organizationName">Organization Name</Label>
                <Input
                  id="organizationName"
                  placeholder="e.g., Active Network"
                  value={newCampaign.organizationName}
                  onChange={(e) => setNewCampaign({...newCampaign, organizationName: e.target.value})}
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="contactEmail">Contact Email *</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="partnerships@example.com"
                  value={newCampaign.contactEmail}
                  onChange={(e) => setNewCampaign({...newCampaign, contactEmail: e.target.value})}
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="template">Email Template *</Label>
                <Select 
                  value={newCampaign.selectedTemplate} 
                  onValueChange={(value) => setNewCampaign({...newCampaign, selectedTemplate: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select email template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.name} value={template.name}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="customMessage">Custom Message (Optional)</Label>
                <Textarea
                  id="customMessage"
                  placeholder="Leave blank to use template, or customize the message..."
                  value={newCampaign.customMessage}
                  onChange={(e) => setNewCampaign({...newCampaign, customMessage: e.target.value})}
                  rows={6}
                />
              </div>

              <div className="col-span-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="apiInterest"
                    checked={newCampaign.apiInterest}
                    onChange={(e) => setNewCampaign({...newCampaign, apiInterest: e.target.checked})}
                  />
                  <Label htmlFor="apiInterest">Highlight API integration opportunities</Label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={prepareOutreach} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Edit className="h-4 w-4 mr-2" />
                )}
                Prepare Email
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Campaign Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Send className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Campaigns</p>
                <p className="text-2xl font-bold">{campaigns.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Responses</p>
                <p className="text-2xl font-bold">
                  {campaigns.filter(c => c.response_received).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Handshake className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Partnerships</p>
                <p className="text-2xl font-bold">
                  {campaigns.filter(c => c.status === 'partnership').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Settings className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">API Interest</p>
                <p className="text-2xl font-bold">
                  {campaigns.filter(c => c.api_interest).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <CardTitle>Outreach Campaigns</CardTitle>
          <CardDescription>
            Track partnership outreach status and responses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4" />
              No outreach campaigns yet. Create your first campaign to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Follow-ups</TableHead>
                  <TableHead>API Interest</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {campaign.organization_name || campaign.hostname}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {campaign.hostname}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(campaign.status)}
                        {getStatusBadge(campaign.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {campaign.sent_at ? (
                        <div className="text-sm">
                          {new Date(campaign.sent_at).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {campaign.follow_up_count}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {campaign.api_interest ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => prepareFollowUp(campaign)}
                          disabled={campaign.status === 'partnership' || loading}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedCampaign(campaign)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}