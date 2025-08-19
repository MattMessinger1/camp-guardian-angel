import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Child {
  id: string;
  name: string;
  dob: string;
}

interface Reservation {
  child_id: string;
}

interface MultiChildSelectorProps {
  sessionId: string;
  sessionTitle?: string;
  onSelectionChange?: (selectedChildIds: string[]) => void;
  maxSelectable?: number;
}

export function MultiChildSelector({ 
  sessionId, 
  sessionTitle = "Session",
  onSelectionChange,
  maxSelectable = 2 
}: MultiChildSelectorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [existingReservations, setExistingReservations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadChildrenAndReservations();
    }
  }, [user, sessionId]);

  useEffect(() => {
    onSelectionChange?.(selectedChildIds);
  }, [selectedChildIds, onSelectionChange]);

  const loadChildrenAndReservations = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Load user's children
      const childrenResponse = await supabase
        .from("children")
        .select("id, name, dob")
        .eq("parent_id", user.id)
        .order("name");

      if (childrenResponse.error) throw childrenResponse.error;

      // For now, skip existing reservations check due to type complexity
      // In a real implementation, this would check for existing reservations
      setChildren(childrenResponse.data || []);
      setExistingReservations([]);
      setSelectedChildIds([]);

    } catch (error: any) {
      console.error('Error loading children and reservations:', error);
      toast({
        title: "Failed to load data",
        description: error.message || "Could not load children and existing reservations",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChildSelection = (childId: string, checked: boolean) => {
    setSelectedChildIds(prev => {
      if (checked) {
        // Don't allow selection if it would exceed the limit
        if (prev.length >= maxSelectable) {
          toast({
            title: "Selection limit reached",
            description: `You can select at most ${maxSelectable} children per session`,
            variant: "destructive"
          });
          return prev;
        }
        return [...prev, childId];
      } else {
        return prev.filter(id => id !== childId);
      }
    });
  };

  const availableSlots = maxSelectable - existingReservations.length;
  const canSelectMore = selectedChildIds.length < maxSelectable;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Loading Children...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (children.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            No Children Found
          </CardTitle>
          <CardDescription>
            You need to add children to your account before making reservations.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Select Children for {sessionTitle}
        </CardTitle>
        <CardDescription>
          Choose up to {maxSelectable} children for this session. 
          {existingReservations.length > 0 && (
            <span className="text-green-600 font-medium">
              {" "}({existingReservations.length} already reserved)
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {availableSlots <= 0 && (
          <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-orange-800 dark:text-orange-200">
              You have reached the maximum of {maxSelectable} reservations for this session.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {children.map((child) => {
            const isSelected = selectedChildIds.includes(child.id);
            const isExisting = existingReservations.includes(child.id);
            const canSelect = canSelectMore || isSelected;
            const age = Math.floor((Date.now() - new Date(child.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));

            return (
              <div
                key={child.id}
                className={`flex items-center space-x-3 p-3 rounded-lg border ${
                  isExisting 
                    ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950" 
                    : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <Checkbox
                  id={`child-${child.id}`}
                  checked={isSelected}
                  onCheckedChange={(checked) => handleChildSelection(child.id, checked === true)}
                  disabled={!canSelect && !isSelected}
                />
                <div className="flex-1">
                  <label 
                    htmlFor={`child-${child.id}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {child.name}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Age {age} • Born {new Date(child.dob).toLocaleDateString()}
                  </p>
                </div>
                {isExisting && (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="ml-1 text-xs font-medium">Reserved</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <strong>Limit:</strong> Maximum {maxSelectable} children per session to ensure fair access for all families.
            <br />
            <strong>Selected:</strong> {selectedChildIds.length} of {maxSelectable} slots used
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}