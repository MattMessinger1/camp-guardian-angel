import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { groupSessionsByWeek, getWeekLabel } from "@/lib/matching/weekOf";
import { 
  Calendar, Clock, MapPin, Users, GripVertical, 
  Plus, Trash2, Star, StarOff, Save, Loader2 
} from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';

interface Session {
  id: string;
  title?: string;
  start_at?: string;
  end_at?: string;
  capacity?: number;
  location?: string;
  registration_open_at?: string;
  camps?: {
    name: string;
  }[];
}

interface Child {
  id: string;
  info_token: string;
}

interface PlanItem {
  id: string;
  session_id: string;
  child_id: string;
  priority: number;
  is_backup: boolean;
  sessions: Session;
}

interface MultiSessionPlannerProps {
  planId: string;
  campId?: string;
  onUpdate?: () => void;
}

interface SortableItemProps {
  item: PlanItem;
  onToggleBackup: (itemId: string, isBackup: boolean) => void;
  onRemove: (itemId: string) => void;
}

function SortableItem({ item, onToggleBackup, onRemove }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const session = item.sessions;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        p-3 border rounded-lg bg-card transition-all
        ${isDragging ? 'opacity-50 z-50' : ''}
        ${item.is_backup ? 'border-orange-200 bg-orange-50' : 'border-blue-200 bg-blue-50'}
      `}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm truncate">
                {session.title || 'Unknown Session'}
              </h4>
              {item.is_backup && (
                <Badge variant="outline" className="text-xs">
                  <StarOff className="h-3 w-3 mr-1" />
                  Backup
                </Badge>
              )}
            </div>
            
            <div className="text-xs text-muted-foreground space-y-1">
              {session.start_at && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(session.start_at), 'MMM d, h:mm a')}
                </div>
              )}
              {session.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {session.location}
                </div>
              )}
              {session.capacity && (
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {session.capacity} spots
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center space-x-2">
            <Switch
              checked={item.is_backup}
              onCheckedChange={(checked) => onToggleBackup(item.id, checked)}
            />
            <Label className="text-xs">Backup</Label>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(item.id)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MultiSessionPlanner({ planId, campId, onUpdate }: MultiSessionPlannerProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadData();
  }, [planId, campId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load sessions for the camp
      let sessionsQuery = supabase
        .from('sessions')
        .select(`
          id, title, start_at, end_at, capacity, location, registration_open_at,
          camps(name)
        `)
        .order('start_at', { ascending: true });

      if (campId) {
        sessionsQuery = sessionsQuery
          .eq('camps.id', campId);
      }

      const { data: sessionsData, error: sessionsError } = await sessionsQuery;
      if (sessionsError) throw sessionsError;

      // Load children
      const { data: childrenData, error: childrenError } = await supabase
        .from('children')
        .select('id, info_token')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
      if (childrenError) throw childrenError;

      // Load existing plan items
      const { data: planItemsData, error: planItemsError } = await supabase
        .from('plan_items')
        .select(`
          id, session_id, child_id, priority, is_backup,
          sessions(id, title, start_at, end_at, capacity, location, registration_open_at)
        `)
        .eq('plan_id', planId)
        .order('priority', { ascending: true });
      if (planItemsError) throw planItemsError;

      setSessions(sessionsData || []);
      setChildren(childrenData || []);
      setPlanItems((planItemsData as any) || []);

      // Auto-select first child if only one
      if (childrenData && childrenData.length === 1) {
        setSelectedChild(childrenData[0].id);
      }
    } catch (error) {
      console.error('Error loading planner data:', error);
      toast({
        title: "Error",
        description: "Failed to load session data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addSession = async (sessionId: string) => {
    if (!selectedChild) {
      toast({
        title: "Select Child",
        description: "Please select a child first",
        variant: "destructive"
      });
      return;
    }

    // Check if already added
    const existing = planItems.find(item => 
      item.session_id === sessionId && item.child_id === selectedChild
    );
    if (existing) {
      toast({
        title: "Already Added",
        description: "This session is already in the plan",
        variant: "destructive"
      });
      return;
    }

    try {
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return;

      const newPriority = Math.max(...planItems.map(item => item.priority), 0) + 1;

      const { data, error } = await supabase
        .from('plan_items')
        .insert({
          plan_id: planId,
          session_id: sessionId,
          child_id: selectedChild,
          priority: newPriority,
          is_backup: false
        })
        .select(`
          id, session_id, child_id, priority, is_backup,
          sessions(id, title, start_at, end_at, capacity, location, registration_open_at)
        `)
        .single();

      if (error) throw error;

      setPlanItems(prev => [...prev, data as any]);
      
      toast({
        title: "Session Added",
        description: `${session.title} added to plan`,
      });
    } catch (error) {
      console.error('Error adding session:', error);
      toast({
        title: "Error",
        description: "Failed to add session to plan",
        variant: "destructive"
      });
    }
  };

  const removeSession = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('plan_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setPlanItems(prev => prev.filter(item => item.id !== itemId));
      
      toast({
        title: "Session Removed",
        description: "Session removed from plan",
      });
    } catch (error) {
      console.error('Error removing session:', error);
      toast({
        title: "Error",
        description: "Failed to remove session",
        variant: "destructive"
      });
    }
  };

  const toggleBackup = async (itemId: string, isBackup: boolean) => {
    try {
      const { error } = await supabase
        .from('plan_items')
        .update({ is_backup: isBackup })
        .eq('id', itemId);

      if (error) throw error;

      setPlanItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, is_backup: isBackup } : item
      ));
    } catch (error) {
      console.error('Error updating backup status:', error);
      toast({
        title: "Error",
        description: "Failed to update backup status",
        variant: "destructive"
      });
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = planItems.findIndex(item => item.id === active.id);
      const newIndex = planItems.findIndex(item => item.id === over.id);
      
      const newOrder = arrayMove(planItems, oldIndex, newIndex);
      setPlanItems(newOrder);

      // Update priorities in database
      try {
        setSaving(true);
        const updates = newOrder.map((item, index) => ({
          id: item.id,
          priority: index + 1
        }));

        for (const update of updates) {
          await supabase
            .from('plan_items')
            .update({ priority: update.priority })
            .eq('id', update.id);
        }
      } catch (error) {
        console.error('Error updating priorities:', error);
        toast({
          title: "Error",
          description: "Failed to update session order",
          variant: "destructive"
        });
        // Reload to restore correct order
        await loadData();
      } finally {
        setSaving(false);
      }
    }
  };

  const childPlanItems = planItems.filter(item => item.child_id === selectedChild);
  const groupedSessions = groupSessionsByWeek(sessions);
  const addedSessionIds = new Set(childPlanItems.map(item => item.session_id));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Child Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Child</CardTitle>
          <CardDescription>
            Choose which child to plan sessions for
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedChild} onValueChange={setSelectedChild}>
            <SelectTrigger>
              <SelectValue placeholder="Select a child" />
            </SelectTrigger>
            <SelectContent>
              {children.map((child) => (
                <SelectItem key={child.id} value={child.id}>
                  {child.info_token}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedChild && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Sessions */}
          <Card>
            <CardHeader>
              <CardTitle>Available Sessions</CardTitle>
              <CardDescription>
                Click to add sessions to your plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {Object.entries(groupedSessions).map(([weekKey, weekSessions]) => (
                    <div key={weekKey}>
                      <h4 className="font-medium text-sm mb-2">
                        {getWeekLabel(weekKey)}
                      </h4>
                      <div className="space-y-2 ml-4">
                        {weekSessions.map((session) => (
                          <div
                            key={session.id}
                            className={`
                              p-3 border rounded-lg transition-all cursor-pointer
                              ${addedSessionIds.has(session.id) 
                                ? 'border-green-200 bg-green-50 opacity-50' 
                                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                              }
                            `}
                            onClick={() => !addedSessionIds.has(session.id) && addSession(session.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="min-w-0 flex-1">
                                <h5 className="font-medium text-sm truncate">
                                  {session.title || 'Unknown Session'}
                                </h5>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {session.start_at && format(new Date(session.start_at), 'MMM d, h:mm a')}
                                </div>
                              </div>
                              {addedSessionIds.has(session.id) && (
                                <Badge variant="secondary" className="text-xs">
                                  Added
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Planned Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Planned Sessions
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              </CardTitle>
              <CardDescription>
                Drag to reorder priority. Toggle backup status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {childPlanItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No sessions planned yet</p>
                  <p className="text-xs">Add sessions from the left panel</p>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={childPlanItems.map(item => item.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {childPlanItems.map((item) => (
                          <SortableItem
                            key={item.id}
                            item={item}
                            onToggleBackup={toggleBackup}
                            onRemove={removeSession}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}