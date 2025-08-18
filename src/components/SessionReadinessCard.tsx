import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Search, 
  CreditCard, 
  User, 
  Baby, 
  FileText,
  Calendar
} from "lucide-react";
import { RequirementResearchModal } from "./RequirementResearchModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface SessionReadinessCardProps {
  session: {
    id: string;
    title: string;
    start_at?: string;
    registration_open_at?: string;
  };
  onReadinessUpdate?: () => void;
}

interface ReadinessData {
  completion_percentage: number;
  ready_for_signup: boolean;
  confidence_in_requirements: string;
  user_researched: boolean;
  required_items: string[];
  completed_items: string[];
  blocked_items: string[];
}

interface RequirementData {
  confidence_level: string;
  deposit_amount_cents?: number;
  required_parent_fields: string[];
  required_child_fields: string[];
  required_documents: string[];
  needs_verification: boolean;
  discovery_method: string;
}

export function SessionReadinessCard({ session, onReadinessUpdate }: SessionReadinessCardProps) {
  const { toast } = useToast();
  const [readiness, setReadiness] = useState<ReadinessData | null>(null);
  const [requirements, setRequirements] = useState<RequirementData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showResearchModal, setShowResearchModal] = useState(false);

  const daysUntilSignup = session.registration_open_at 
    ? Math.ceil((new Date(session.registration_open_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const loadReadinessData = async () => {
    try {
      // Discover requirements for this session
      const { data: reqData, error: reqError } = await supabase.functions.invoke('discover-session-requirements', {
        body: { session_id: session.id }
      });

      if (reqError) throw reqError;

      if (reqData?.discovery?.requirements) {
        setRequirements({
          confidence_level: reqData.discovery.confidence,
          deposit_amount_cents: reqData.discovery.requirements.deposit_amount_cents,
          required_parent_fields: reqData.discovery.requirements.required_parent_fields || [],
          required_child_fields: reqData.discovery.requirements.required_child_fields || [],
          required_documents: reqData.discovery.requirements.required_documents || [],
          needs_verification: reqData.discovery.needsVerification,
          discovery_method: reqData.discovery.method
        });
      }

      // Get user's readiness for this session
      const { data: readinessData, error: readinessError } = await supabase
        .from('user_session_readiness')
        .select('*')
        .eq('session_id', session.id)
        .single();

      if (readinessError && readinessError.code !== 'PGRST116') {
        throw readinessError;
      }

      if (readinessData) {
        setReadiness({
          completion_percentage: readinessData.completion_percentage,
          ready_for_signup: readinessData.ready_for_signup,
          confidence_in_requirements: readinessData.confidence_in_requirements,
          user_researched: readinessData.user_researched,
          required_items: Array.isArray(readinessData.required_items) ? readinessData.required_items.filter(item => typeof item === 'string') : [],
          completed_items: Array.isArray(readinessData.completed_items) ? readinessData.completed_items.filter(item => typeof item === 'string') : [],
          blocked_items: Array.isArray(readinessData.blocked_items) ? readinessData.blocked_items.filter(item => typeof item === 'string') : []
        });
      } else {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // Initialize readiness tracking
        const { error: initError } = await supabase
          .from('user_session_readiness')
          .insert({
            user_id: user.id,
            session_id: session.id,
            required_items: ['payment_method', 'parent_info', 'child_info'],
            completed_items: [],
            blocked_items: [],
            completion_percentage: 0,
            ready_for_signup: false,
            confidence_in_requirements: reqData?.discovery?.confidence || 'estimated'
          });

        if (initError) throw initError;
        
        // Reload after initialization
        loadReadinessData();
        return;
      }

    } catch (error: any) {
      console.error("Error loading readiness data:", error);
      toast({
        title: "Error",
        description: "Failed to load session readiness information",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReadinessData();
  }, [session.id]);

  const handleResearchSubmitted = () => {
    loadReadinessData();
    onReadinessUpdate?.();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500';
      case 'verified': return 'bg-blue-500';
      case 'estimated': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getUrgencyStyle = () => {
    if (daysUntilSignup === null) return {};
    
    if (daysUntilSignup <= 3) return { borderLeft: '4px solid #ef4444' }; // red
    if (daysUntilSignup <= 7) return { borderLeft: '4px solid #f97316' }; // orange
    if (daysUntilSignup <= 14) return { borderLeft: '4px solid #eab308' }; // yellow
    return {};
  };

  if (isLoading) {
    return (
      <Card style={getUrgencyStyle()}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-2 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const showResearchPrompt = daysUntilSignup !== null && 
    daysUntilSignup <= 14 && 
    requirements?.needs_verification && 
    !readiness?.user_researched;

  return (
    <>
      <Card style={getUrgencyStyle()}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">{session.title}</CardTitle>
              {session.registration_open_at && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Registration opens {formatDistanceToNow(new Date(session.registration_open_at), { addSuffix: true })}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant="secondary" 
                className={`${getStatusColor(requirements?.confidence_level || 'estimated')} text-white`}
              >
                {requirements?.confidence_level || 'estimated'}
              </Badge>
              {readiness?.ready_for_signup && (
                <Badge variant="default" className="bg-green-500 text-white">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Ready!
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Preparation Progress</span>
              <span>{readiness?.completion_percentage || 0}%</span>
            </div>
            <Progress value={readiness?.completion_percentage || 0} />
          </div>

          {/* Requirements preview */}
          {requirements && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Requirements</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {requirements.deposit_amount_cents && (
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-3 w-3 text-green-600" />
                    <span>${(requirements.deposit_amount_cents / 100).toFixed(2)} deposit</span>
                  </div>
                )}
                {requirements.required_parent_fields.length > 0 && (
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3 text-blue-600" />
                    <span>{requirements.required_parent_fields.length} parent fields</span>
                  </div>
                )}
                {requirements.required_child_fields.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Baby className="h-3 w-3 text-purple-600" />
                    <span>{requirements.required_child_fields.length} child fields</span>
                  </div>
                )}
                {requirements.required_documents.length > 0 && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-3 w-3 text-orange-600" />
                    <span>{requirements.required_documents.length} documents</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Research prompt */}
          {showResearchPrompt && (
            <>
              <Separator />
              <div className="space-y-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">
                    Help Verify Requirements
                  </span>
                </div>
                <p className="text-xs text-yellow-700">
                  Registration opens in {daysUntilSignup} days! Help yourself and other parents by researching the exact signup requirements.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowResearchModal(true)}
                  className="w-full"
                >
                  <Search className="h-3 w-3 mr-1" />
                  Research Requirements
                </Button>
              </div>
            </>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            {readiness?.ready_for_signup ? (
              <Button className="flex-1" disabled>
                <CheckCircle className="h-4 w-4 mr-2" />
                Ready for Signup!
              </Button>
            ) : (
              <Button variant="outline" className="flex-1">
                <Clock className="h-4 w-4 mr-2" />
                Complete Prep
              </Button>
            )}
            
            {!readiness?.user_researched && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowResearchModal(true)}
              >
                <Search className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <RequirementResearchModal
        open={showResearchModal}
        onOpenChange={(open) => {
          setShowResearchModal(open);
          if (!open) handleResearchSubmitted();
        }}
        sessionId={session.id}
        sessionTitle={session.title}
        currentRequirements={requirements}
        daysUntilSignup={daysUntilSignup || undefined}
      />
    </>
  );
}