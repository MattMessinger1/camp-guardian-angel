import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  ExternalLink, 
  CheckCircle, 
  Shield, 
  BookOpen,
  Clock,
  Crown,
  Dumbbell,
  Users
} from "lucide-react";
import { ProviderBadge } from "@/components/ui/provider-badge";

interface ProviderAccountGuidanceProps {
  provider: string;
  providerName?: string;
  accountUrl?: string;
  classData?: any;
  providerInfo?: any;
  onAccountCreated: () => void;
}

export function ProviderAccountGuidance({ 
  provider, 
  providerName, 
  accountUrl, 
  classData, 
  providerInfo,
  onAccountCreated 
}: ProviderAccountGuidanceProps) {
  
  const getProviderGuidance = () => {
    switch (provider) {
      case 'jackrabbit_class':
        return {
          title: 'Jackrabbit Class Account Setup',
          description: `To register for ${providerName || 'this class'}, you'll need a parent account on their Jackrabbit platform.`,
          setupSteps: [
            'Visit the class provider\'s parent portal',
            'Create a parent account with your email and contact information',
            'Add your child\'s information to your profile',
            'Verify your email address if required'
          ],
          credentialNote: 'We\'ll securely store your Jackrabbit login to register instantly when spots open.',
          icon: Users,
          color: 'purple'
        };
      case 'resy':
      case 'restaurant-resy':
        return {
          title: 'Resy Account Setup',
          description: `To book at ${providerName || 'this restaurant'}, you need a Resy account.`,
          setupSteps: [
            'Create a Resy account at resy.com',
            'Add your contact information and dining preferences',
            'Add a payment method to your Resy account',
            'Verify your phone number for booking confirmations'
          ],
          credentialNote: 'We\'ll use your Resy login to book instantly when reservations open.',
          icon: Crown,
          color: 'red'
        };
      case 'peloton':
      case 'fitness-peloton':
        return {
          title: 'Peloton Account Setup', 
          description: `To book ${providerName || 'Peloton'} studio classes, you need an active Peloton membership.`,
          setupSteps: [
            'Log into your existing Peloton account',
            'Ensure your membership is active and in good standing',
            'Add a payment method for class booking fees',
            'Verify your profile information is up to date'
          ],
          credentialNote: 'We\'ll use your Peloton login to book studio classes the moment they become available.',
          icon: Dumbbell,
          color: 'orange'
        };
      default:
        return {
          title: 'Account Setup',
          description: `To register for ${providerName || 'this activity'}, you may need an account on the provider's platform.`,
          setupSteps: [
            'Visit the provider\'s registration website',
            'Create an account with your email and contact information', 
            'Complete any required profile information',
            'Verify your account if needed'
          ],
          credentialNote: 'We\'ll securely store your login credentials for instant registration.',
          icon: User,
          color: 'blue'
        };
    }
  };

  const guidance = getProviderGuidance();
  const IconComponent = guidance.icon;
  const isJackrabbitClass = provider === 'jackrabbit_class';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconComponent className="h-5 w-5 text-primary" />
          {guidance.title}
          <ProviderBadge platform={provider} size="sm" />
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {guidance.description}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="font-semibold mb-2">Setup Steps:</div>
          <ul className="list-decimal list-inside space-y-1 text-sm">
            {guidance.setupSteps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ul>
        </div>

        {isJackrabbitClass && classData && (
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4 text-purple-600" />
              <span className="font-semibold text-purple-900">Class Information</span>
            </div>
            <div className="text-sm text-purple-700 space-y-1">
              <p><strong>Class:</strong> {classData.name}</p>
              {classData.schedule?.[0] && (
                <p><strong>Schedule:</strong> {classData.schedule[0].day} {classData.schedule[0].time}</p>
              )}
              {classData.tuition && (
                <p><strong>Tuition:</strong> ${classData.tuition.amount}/{classData.tuition.period}</p>
              )}
              {classData.ageRange && (
                <p><strong>Ages:</strong> {classData.ageRange.min}-{classData.ageRange.max}</p>
              )}
              {classData.instructor && (
                <p><strong>Instructor:</strong> {classData.instructor}</p>
              )}
            </div>
          </div>
        )}

        <div className={`bg-${guidance.color}-50 p-3 rounded-lg`}>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-blue-600" />
            <span className="font-semibold text-blue-900">Credential Security</span>
          </div>
          <p className="text-sm text-blue-700">
            {guidance.credentialNote}
          </p>
        </div>

        <Separator />

        <div className="space-y-3">
          <Button 
            onClick={() => accountUrl && window.open(accountUrl, '_blank')}
            className="w-full"
            disabled={!accountUrl}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Create Account{providerName ? ` at ${providerName}` : ''}
          </Button>
          <Button 
            variant="outline" 
            onClick={onAccountCreated}
            className="w-full"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            I've Created My Account
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}