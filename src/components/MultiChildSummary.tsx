import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface PlanChildMap {
  id: string;
  child_id: string;
  session_ids: string[];
  priority: number;
  conflict_resolution: string;
}

interface Child {
  id: string;
  name?: string;
  dob?: string;
  notes?: string;
  info_token?: string; // For backward compatibility
}

interface MultiChildSummaryProps {
  planId: string;
}

export function MultiChildSummary({ planId }: MultiChildSummaryProps) {
  const [mappings, setMappings] = useState<PlanChildMap[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummaryData();
  }, [planId]);

  const loadSummaryData = async () => {
    try {
      // Load plan children mappings
      const { data: mappingsData } = await supabase
        .from('plan_children_map')
        .select('*')
        .eq('plan_id', planId)
        .order('priority');

      // Load children info (try new schema first, fallback to old)
      let childrenData;
      try {
        const { data } = await supabase
          .from('children')
          .select('id, name, dob, notes');
        childrenData = data;
      } catch (error) {
        // Fallback to old schema
        const { data } = await supabase
          .from('children_old')
          .select('id, info_token')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
        childrenData = data;
      }

      setMappings((mappingsData as PlanChildMap[]) || []);
      setChildren(childrenData || []);
    } catch (error) {
      console.error('Error loading summary data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChildName = (childId: string) => {
    const child = children.find(c => c.id === childId);
    return child ? (child.name || (child.info_token ? `Child ${child.info_token.slice(0, 8)}` : 'Unknown Child')) : 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading summary...
      </div>
    );
  }

  if (mappings.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No children configured for this plan yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {mappings.map((mapping, index) => (
        <div key={mapping.id} className="flex items-center justify-between p-3 border rounded">
          <div className="flex items-center space-x-3">
            <Badge variant="secondary">#{index + 1}</Badge>
            <div>
              <div className="font-medium">{getChildName(mapping.child_id)}</div>
              <div className="text-sm text-muted-foreground">
                {mapping.session_ids.length} sessions • {mapping.conflict_resolution}
              </div>
            </div>
          </div>
          <Badge variant="outline">
            Priority {mapping.priority + 1}
          </Badge>
        </div>
      ))}
      <div className="text-center text-sm text-muted-foreground pt-2 border-t">
        Total: {mappings.length} children, {mappings.reduce((acc, m) => acc + m.session_ids.length, 0)} session registrations planned
      </div>
    </div>
  );
}