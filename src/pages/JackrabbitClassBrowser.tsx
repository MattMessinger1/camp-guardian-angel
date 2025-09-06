import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  Clock, 
  Users, 
  DollarSign, 
  Search,
  ArrowLeft,
  Loader2,
  BookOpen,
  MapPin
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ProviderBadge } from "@/components/ui/provider-badge";

interface JackrabbitClass {
  id: string;
  name: string;
  description?: string;
  schedule: {
    day: string;
    time: string;
    duration?: string;
  }[];
  ageRange?: {
    min: number;
    max: number;
  };
  capacity?: number;
  currentEnrollment?: number;
  tuition?: {
    amount: number;
    period: string;
  };
  registrationOpensAt?: string;
  location?: string;
  instructor?: string;
}

export default function JackrabbitClassBrowser() {
  const { providerId } = useParams<{ providerId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [classes, setClasses] = useState<JackrabbitClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [providerInfo, setProviderInfo] = useState<{
    name: string;
    website?: string;
    location?: string;
  } | null>(null);

  useEffect(() => {
    loadJackrabbitClasses();
  }, [providerId]);

  const loadJackrabbitClasses = async () => {
    if (!providerId) return;
    
    try {
      setLoading(true);
      
      // Call the jackrabbit import function
      const { data, error } = await supabase.functions.invoke('jackrabbit-import-classes', {
        body: { 
          provider_id: providerId,
          studio_url: `https://${providerId}.jackrabbitclass.com` // Construct URL from provider ID
        }
      });

      if (error) {
        console.error('Error loading Jackrabbit classes:', error);
        toast.error('Failed to load classes. Please try again.');
        return;
      }

      if (data?.classes) {
        setClasses(data.classes);
        setProviderInfo(data.providerInfo);
      }
      
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const filteredClasses = classes.filter(cls =>
    cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cls.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleArmSignup = async (selectedClass: JackrabbitClass) => {
    if (!user) {
      toast.error('Please sign in to continue');
      navigate('/auth');
      return;
    }

    try {
      // Create an activity record for this class
      const { data: activity, error: activityError } = await supabase
        .from('activities')
        .insert({
          name: selectedClass.name,
          description: selectedClass.description,
          provider_id: providerId,
          canonical_url: `https://${providerId}.jackrabbitclass.com`,
          kind: 'class'
        })
        .select()
        .single();

      if (activityError) throw activityError;

      // Navigate to the ready-to-signup flow with the new activity
      navigate(`/ready-to-signup/${activity.id}`, {
        state: {
          classData: selectedClass,
          providerInfo,
          provider: 'jackrabbit_class'
        }
      });

    } catch (error) {
      console.error('Error setting up class signup:', error);
      toast.error('Failed to set up signup. Please try again.');
    }
  };

  const formatSchedule = (schedule: JackrabbitClass['schedule']) => {
    return schedule.map(s => `${s.day} ${s.time}`).join(', ');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading Jackrabbit classes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <ProviderBadge platform="jackrabbit_class" size="md" />
          </div>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {providerInfo?.name || `${providerId} Classes`}
              </h1>
              {providerInfo?.location && (
                <div className="flex items-center gap-2 text-muted-foreground mb-4">
                  <MapPin className="h-4 w-4" />
                  <span>{providerInfo.location}</span>
                </div>
              )}
              <p className="text-lg text-muted-foreground">
                Browse classes and arm your signup for competitive registration
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="mt-6 relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search classes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="container mx-auto px-4 py-6">
        {filteredClasses.length === 0 ? (
          <Card className="text-center p-8">
            <CardContent>
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No classes found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? 'Try adjusting your search terms.' : 'No classes available at this time.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Found {filteredClasses.length} {filteredClasses.length === 1 ? 'class' : 'classes'}
            </div>

            {filteredClasses.map((cls) => (
              <Card key={cls.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl font-bold">{cls.name}</CardTitle>
                      {cls.description && (
                        <p className="text-muted-foreground mt-2">{cls.description}</p>
                      )}
                    </div>
                    <Button 
                      onClick={() => handleArmSignup(cls)}
                      className="bg-primary hover:bg-primary/90"
                    >
                      Arm Your Signup
                    </Button>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Schedule */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Calendar className="h-4 w-4" />
                        Schedule
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatSchedule(cls.schedule)}
                      </div>
                    </div>

                    {/* Age Range & Capacity */}
                    <div className="space-y-3">
                      {cls.ageRange && (
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4 text-blue-600" />
                          <span>Ages {cls.ageRange.min}-{cls.ageRange.max}</span>
                        </div>
                      )}
                      
                      {cls.capacity && (
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4 text-green-600" />
                          <span>
                            {cls.currentEnrollment || 0}/{cls.capacity} enrolled
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Tuition & Registration */}
                    <div className="space-y-3">
                      {cls.tuition && (
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span>
                            ${cls.tuition.amount}/{cls.tuition.period}
                          </span>
                        </div>
                      )}
                      
                      {cls.registrationOpensAt && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-orange-600" />
                          <span>
                            Opens: {new Date(cls.registrationOpensAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      {cls.instructor && (
                        <div className="text-sm text-muted-foreground">
                          Instructor: {cls.instructor}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}