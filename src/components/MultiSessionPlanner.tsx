import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Trash2, GripVertical, Users, CalendarDays } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Child {
  id: string;
  info_token: string;
}

interface Session {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  capacity?: number;
  upfront_fee_cents?: number;
}

interface PlanChildMap {
  id: string;
  child_id: string;
  session_ids: string[];
  priority: number;
  conflict_resolution: 'skip' | 'next_available' | 'waitlist';
}

interface MultiSessionPlannerProps {
  planId: string;
  onUpdate?: () => void;
}

export function MultiSessionPlanner({ planId, onUpdate }: MultiSessionPlannerProps) {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [planChildMaps, setPlanChildMaps] = useState<PlanChildMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && planId) {
      loadData();
    }
  }, [user, planId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load user's children
      const { data: childrenData, error: childrenError } = await supabase
        .from('children')
        .select('*')
        .eq('user_id', user?.id);

      if (childrenError) throw childrenError;

      // Load available sessions (mock data for now)
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .limit(20);

      if (sessionsError) throw sessionsError;

      // Load existing plan children mappings
      const { data: mappingsData, error: mappingsError } = await supabase
        .from('plan_children_map')
        .select('*')
        .eq('plan_id', planId)
        .order('priority');

      if (mappingsError) throw mappingsError;

      setChildren(childrenData || []);
      setSessions(sessionsData || []);
      setPlanChildMaps((mappingsData as PlanChildMap[]) || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load planning data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addChildToPlan = () => {
    const availableChildren = children.filter(
      child => !planChildMaps.some(map => map.child_id === child.id)
    );

    if (availableChildren.length === 0) {
      toast({
        title: "No Children Available",
        description: "All children are already added to this plan",
        variant: "destructive"
      });
      return;
    }

    const newMapping: PlanChildMap = {
      id: `temp-${Date.now()}`,
      child_id: availableChildren[0].id,
      session_ids: [],
      priority: planChildMaps.length,
      conflict_resolution: 'next_available'
    };

    setPlanChildMaps([...planChildMaps, newMapping]);
  };

  const removeChildFromPlan = (index: number) => {
    const newMappings = planChildMaps.filter((_, i) => i !== index);
    // Reorder priorities
    const reorderedMappings = newMappings.map((mapping, i) => ({
      ...mapping,
      priority: i
    }));
    setPlanChildMaps(reorderedMappings);
  };

  const updateChildMapping = (index: number, updates: Partial<PlanChildMap>) => {
    const newMappings = [...planChildMaps];
    newMappings[index] = { ...newMappings[index], ...updates };
    setPlanChildMaps(newMappings);
  };

  const moveChildPriority = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= planChildMaps.length) return;

    const newMappings = [...planChildMaps];
    [newMappings[index], newMappings[newIndex]] = [newMappings[newIndex], newMappings[index]];
    
    // Update priorities
    newMappings.forEach((mapping, i) => {
      mapping.priority = i;
    });

    setPlanChildMaps(newMappings);
  };

  const toggleSessionForChild = (childIndex: number, sessionId: string) => {
    const mapping = planChildMaps[childIndex];
    const currentSessions = mapping.session_ids || [];
    
    const newSessions = currentSessions.includes(sessionId)
      ? currentSessions.filter(id => id !== sessionId)
      : [...currentSessions, sessionId];

    updateChildMapping(childIndex, { session_ids: newSessions });
  };

  const savePlan = async () => {
    if (!planId) return;

    setSaving(true);
    try {
      // Delete existing mappings for this plan
      const { error: deleteError } = await supabase
        .from('plan_children_map')
        .delete()
        .eq('plan_id', planId);

      if (deleteError) throw deleteError;

      // Insert new mappings
      if (planChildMaps.length > 0) {
        const mappingsToInsert = planChildMaps.map(mapping => ({
          plan_id: planId,
          child_id: mapping.child_id,
          session_ids: mapping.session_ids,
          priority: mapping.priority,
          conflict_resolution: mapping.conflict_resolution
        }));

        const { error: insertError } = await supabase
          .from('plan_children_map')
          .insert(mappingsToInsert);

        if (insertError) throw insertError;
      }

      toast({
        title: "Success",
        description: "Multi-child registration plan saved successfully"
      });

      onUpdate?.();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast({
        title: "Error",
        description: "Failed to save registration plan",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const getChildName = (childId: string) => {
    const child = children.find(c => c.id === childId);
    return child ? `Child ${child.info_token.slice(0, 8)}` : 'Unknown Child';
  };

  const getSessionTitle = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    return session ? session.title : 'Unknown Session';
  };

  const formatSessionDate = (dateString: string) => {
    if (!dateString) return 'No date';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Multi-Child Registration Planner
        </CardTitle>
        <CardDescription>
          Plan registration for multiple children with priority ordering and conflict resolution
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Child Button */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {planChildMaps.length} children planned for registration
          </div>
          <Button onClick={addChildToPlan} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Child
          </Button>
        </div>

        {/* Children List */}
        <div className="space-y-4">
          {planChildMaps.map((mapping, index) => (
            <Card key={mapping.id} className="border-l-4 border-l-primary">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex flex-col items-center space-y-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveChildPriority(index, 'up')}
                        disabled={index === 0}
                      >
                        ↑
                      </Button>
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveChildPriority(index, 'down')}
                        disabled={index === planChildMaps.length - 1}
                      >
                        ↓
                      </Button>
                    </div>
                    <div>
                      <Badge variant="secondary">Priority {index + 1}</Badge>
                      <h4 className="font-medium mt-1">{getChildName(mapping.child_id)}</h4>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeChildFromPlan(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Child Selector */}
                <div>
                  <Label>Child</Label>
                  <Select
                    value={mapping.child_id}
                    onValueChange={(value) => updateChildMapping(index, { child_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {children.map((child) => (
                        <SelectItem key={child.id} value={child.id}>
                          Child {child.info_token.slice(0, 8)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Conflict Resolution */}
                <div>
                  <Label>If session is full</Label>
                  <Select
                    value={mapping.conflict_resolution}
                    onValueChange={(value: 'skip' | 'next_available' | 'waitlist') =>
                      updateChildMapping(index, { conflict_resolution: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">Skip this child</SelectItem>
                      <SelectItem value="next_available">Try next available session</SelectItem>
                      <SelectItem value="waitlist">Join waitlist</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Session Selection */}
                <div>
                  <Label className="flex items-center">
                    <CalendarDays className="h-4 w-4 mr-2" />
                    Sessions ({mapping.session_ids.length} selected)
                  </Label>
                  <div className="grid grid-cols-1 gap-2 mt-2 max-h-40 overflow-y-auto">
                    {sessions.slice(0, 10).map((session) => (
                      <div key={session.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${mapping.id}-${session.id}`}
                          checked={mapping.session_ids.includes(session.id)}
                          onCheckedChange={() => toggleSessionForChild(index, session.id)}
                        />
                        <Label
                          htmlFor={`${mapping.id}-${session.id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          <div className="flex justify-between">
                            <span>{session.title}</span>
                            <span className="text-muted-foreground">
                              {formatSessionDate(session.start_at)}
                            </span>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selected Sessions Summary */}
                {mapping.session_ids.length > 0 && (
                  <div className="p-3 bg-muted/50 rounded">
                    <div className="text-xs font-medium text-muted-foreground mb-2">
                      Selected Sessions:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {mapping.session_ids.map((sessionId) => (
                        <Badge key={sessionId} variant="outline" className="text-xs">
                          {getSessionTitle(sessionId)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {planChildMaps.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No children added to this plan yet.</p>
            <p className="text-sm">Click "Add Child" to start planning registrations.</p>
          </div>
        )}

        {/* Save Button */}
        <div className="pt-4 border-t">
          <Button onClick={savePlan} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving Plan...
              </>
            ) : (
              <>
                <Users className="h-4 w-4 mr-2" />
                Save Multi-Child Plan
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}