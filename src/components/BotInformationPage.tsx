import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Bot, 
  Shield, 
  Users, 
  Mail, 
  Phone, 
  MessageSquare, 
  Clock, 
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Send,
  Info
} from 'lucide-react';

interface ContactForm {
  name: string;
  email: string;
  organization: string;
  website: string;
  subject: string;
  message: string;
  requestType: 'partnership' | 'technical' | 'complaint' | 'general';
}

export function BotInformationPage() {
  const [contactForm, setContactForm] = useState<ContactForm>({
    name: '',
    email: '',
    organization: '',
    website: '',
    subject: '',
    message: '',
    requestType: 'general'
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in your name, email, and message.',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('send-email-sendgrid', {
        body: {
          to: 'partnerships@campgenie.com',
          subject: `Camp Provider Contact: ${contactForm.subject}`,
          html: `
            <h2>New Contact from Camp Provider</h2>
            <p><strong>Name:</strong> ${contactForm.name}</p>
            <p><strong>Email:</strong> ${contactForm.email}</p>
            <p><strong>Organization:</strong> ${contactForm.organization}</p>
            <p><strong>Website:</strong> ${contactForm.website}</p>
            <p><strong>Request Type:</strong> ${contactForm.requestType}</p>
            <p><strong>Subject:</strong> ${contactForm.subject}</p>
            <p><strong>Message:</strong></p>
            <p>${contactForm.message.replace(/\n/g, '<br>')}</p>
          `
        }
      });

      if (error) throw error;

      toast({
        title: 'Message sent successfully',
        description: 'We\'ll get back to you within 24 hours.'
      });

      // Reset form
      setContactForm({
        name: '',
        email: '',
        organization: '',
        website: '',
        subject: '',
        message: '',
        requestType: 'general'
      });

    } catch (error: any) {
      toast({
        title: 'Failed to send message',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-center mb-8">
            <Bot className="h-16 w-16 mr-4" />
            <div>
              <h1 className="text-4xl font-bold">CampGenie Bot</h1>
              <p className="text-xl opacity-90">Automated Camp Registration Assistant</p>
            </div>
          </div>
          <p className="text-center text-lg opacity-90 max-w-3xl mx-auto">
            We're an automated system that helps parents register their children for camps. 
            We respect your terms of service and work to build positive partnerships with camp providers.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 space-y-12">
        {/* What We Do */}
        <section>
          <h2 className="text-3xl font-bold text-center mb-8">What We Do</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-blue-500" />
                <h3 className="text-xl font-semibold mb-2">Help Parents</h3>
                <p className="text-muted-foreground">
                  We assist busy parents in finding and registering for camps that fit their children's needs and schedules.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <Shield className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <h3 className="text-xl font-semibold mb-2">Respect Your Terms</h3>
                <p className="text-muted-foreground">
                  We strictly follow your robots.txt and terms of service. If automation isn't permitted, we stop immediately.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-purple-500" />
                <h3 className="text-xl font-semibold mb-2">Human Oversight</h3>
                <p className="text-muted-foreground">
                  Every action is monitored by humans. CAPTCHAs and complex scenarios always involve human verification.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Our Commitments */}
        <section>
          <h2 className="text-3xl font-bold text-center mb-8">Our Commitments to Camp Providers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Compliance First
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                    We respect robots.txt files
                  </li>
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                    We follow rate limits and server capacity
                  </li>
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                    We stop immediately if asked
                  </li>
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                    We maintain detailed compliance logs
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Partnership Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                    Official API integrations available
                  </li>
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                    Revenue sharing for partners
                  </li>
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                    Increased enrollment visibility
                  </li>
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                    Dedicated technical support
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Technical Details */}
        <section>
          <h2 className="text-3xl font-bold text-center mb-8">Technical Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Bot Identification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">User Agent</Label>
                  <code className="block mt-1 p-2 bg-muted rounded text-sm">
                    CampGenie-Bot/1.0 (+https://campgenie.com/bot-info)
                  </code>
                </div>
                <div>
                  <Label className="text-sm font-medium">IP Ranges</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Our traffic comes from verified cloud providers. Contact us for current IP ranges.
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Request Rate</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Maximum 1 request per second per domain, with adaptive delays based on server response times.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>What We Access</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <Info className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Only publicly available camp information and schedules</span>
                  </li>
                  <li className="flex items-start">
                    <Info className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Registration forms for enrolled families only</span>
                  </li>
                  <li className="flex items-start">
                    <Info className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>No private or sensitive data is collected</span>
                  </li>
                  <li className="flex items-start">
                    <AlertTriangle className="h-4 w-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>We actively avoid any HIPAA or medical information</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Contact Us */}
        <section>
          <h2 className="text-3xl font-bold text-center mb-8">Contact Us</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Get in Touch</CardTitle>
                <CardDescription>
                  We'd love to hear from you. Choose the best way to reach us.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">General Inquiries</p>
                      <p className="text-sm text-muted-foreground">hello@campgenie.com</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">Partnerships & API Access</p>
                      <p className="text-sm text-muted-foreground">partnerships@campgenie.com</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="font-medium">Technical Issues or Complaints</p>
                      <p className="text-sm text-muted-foreground">support@campgenie.com</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="font-medium">Urgent Issues</p>
                      <p className="text-sm text-muted-foreground">1-800-CAMP-HELP</p>
                    </div>
                  </div>
                </div>

                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    We typically respond within 24 hours during business days. 
                    For urgent issues affecting your servers, call our emergency line.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Contact Form */}
            <Card>
              <CardHeader>
                <CardTitle>Send us a Message</CardTitle>
                <CardDescription>
                  Fill out the form below and we'll get back to you soon.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={contactForm.name}
                        onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="organization">Organization</Label>
                      <Input
                        id="organization"
                        value={contactForm.organization}
                        onChange={(e) => setContactForm({...contactForm, organization: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        type="url"
                        value={contactForm.website}
                        onChange={(e) => setContactForm({...contactForm, website: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="requestType">Request Type</Label>
                    <select
                      id="requestType"
                      value={contactForm.requestType}
                      onChange={(e) => setContactForm({...contactForm, requestType: e.target.value as any})}
                      className="w-full mt-1 p-2 border border-input rounded-md bg-background"
                    >
                      <option value="general">General Inquiry</option>
                      <option value="partnership">Partnership & API Access</option>
                      <option value="technical">Technical Issue</option>
                      <option value="complaint">Complaint or Concern</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      value={contactForm.subject}
                      onChange={(e) => setContactForm({...contactForm, subject: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      rows={4}
                      value={contactForm.message}
                      onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? (
                      <>Loading...</>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <section className="text-center py-8 border-t">
          <p className="text-muted-foreground mb-4">
            CampGenie is committed to ethical automation and positive partnerships with camp providers.
          </p>
          <div className="flex justify-center space-x-4">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Privacy Policy
            </Button>
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Terms of Service
            </Button>
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Transparency Report
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}