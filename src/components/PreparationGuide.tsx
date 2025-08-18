import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { Clock, Bell, CheckCircle, FileText, User, CreditCard, AlertTriangle } from 'lucide-react';
import { PREPARATION_GUIDANCE } from '@/lib/constants/camp-status';

interface PreparationGuideProps {
  campName?: string;
  showAsCard?: boolean;
}

export function PreparationGuide({ campName, showAsCard = true }: PreparationGuideProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [completedCategories, setCompletedCategories] = useState<Set<string>>(new Set());

  // Load saved progress from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`preparation-progress-${user?.id}`);
    if (saved) {
      try {
        const { checked, completed } = JSON.parse(saved);
        setCheckedItems(new Set(checked));
        setCompletedCategories(new Set(completed));
      } catch (error) {
        console.error('Failed to load preparation progress:', error);
      }
    }
  }, [user?.id]);

  // Save progress to localStorage
  const saveProgress = (checked: Set<string>, completed: Set<string>) => {
    if (user?.id) {
      localStorage.setItem(`preparation-progress-${user.id}`, JSON.stringify({
        checked: Array.from(checked),
        completed: Array.from(completed)
      }));
    }
  };

  const handleItemCheck = (itemId: string, categoryKey: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(itemId)) {
      newChecked.delete(itemId);
    } else {
      newChecked.add(itemId);
    }
    setCheckedItems(newChecked);

    // Check if all items in category are complete
    const categoryItems = PREPARATION_GUIDANCE.GENERAL_CAMP_PREP.items.find(
      cat => cat.category.toLowerCase().replace(/\s+/g, '_') === categoryKey
    )?.items || [];
    
    const categoryItemIds = categoryItems.map((_, idx) => `${categoryKey}_${idx}`);
    const allCategoryItemsChecked = categoryItemIds.every(id => newChecked.has(id));
    
    const newCompleted = new Set(completedCategories);
    if (allCategoryItemsChecked) {
      newCompleted.add(categoryKey);
    } else {
      newCompleted.delete(categoryKey);
    }
    setCompletedCategories(newCompleted);

    saveProgress(newChecked, newCompleted);
  };

  const handleMarkCategoryComplete = (categoryKey: string) => {
    const categoryItems = PREPARATION_GUIDANCE.GENERAL_CAMP_PREP.items.find(
      cat => cat.category.toLowerCase().replace(/\s+/g, '_') === categoryKey
    )?.items || [];
    
    const categoryItemIds = categoryItems.map((_, idx) => `${categoryKey}_${idx}`);
    
    const newChecked = new Set(checkedItems);
    categoryItemIds.forEach(id => newChecked.add(id));
    
    const newCompleted = new Set(completedCategories);
    newCompleted.add(categoryKey);
    
    setCheckedItems(newChecked);
    setCompletedCategories(newCompleted);
    saveProgress(newChecked, newCompleted);

    toast({
      title: "Category completed!",
      description: `${categoryKey.replace('_', ' ')} preparation is complete`
    });
  };

  const totalItems = PREPARATION_GUIDANCE.GENERAL_CAMP_PREP.items.reduce(
    (total, category) => total + category.items.length, 0
  );
  const completedItems = checkedItems.size;
  const progressPercentage = Math.round((completedItems / totalItems) * 100);

  const content = (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">
          {campName ? `Preparing for ${campName}` : PREPARATION_GUIDANCE.GENERAL_CAMP_PREP.title}
        </h3>
        <p className="text-muted-foreground mb-4">
          {PREPARATION_GUIDANCE.GENERAL_CAMP_PREP.description}
        </p>
        
        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Preparation Progress</span>
            <span className="text-sm text-muted-foreground">{completedItems}/{totalItems} items</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground mt-1">{progressPercentage}% complete</div>
        </div>
      </div>

      <Tabs defaultValue="checklist" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="checklist">Preparation Checklist</TabsTrigger>
          <TabsTrigger value="timeline">Timeline Guide</TabsTrigger>
        </TabsList>

        <TabsContent value="checklist" className="space-y-4">
          <Accordion type="multiple" className="w-full">
            {PREPARATION_GUIDANCE.GENERAL_CAMP_PREP.items.map((category, categoryIdx) => {
              const categoryKey = category.category.toLowerCase().replace(/\s+/g, '_');
              const isCompleted = completedCategories.has(categoryKey);
              const categoryItems = category.items;
              const categoryItemIds = categoryItems.map((_, idx) => `${categoryKey}_${idx}`);
              const checkedInCategory = categoryItemIds.filter(id => checkedItems.has(id)).length;
              
              return (
                <AccordionItem key={categoryKey} value={categoryKey}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 flex-1">
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                      )}
                      <div className="flex items-center gap-2 flex-1">
                        <span className="font-medium">{category.category}</span>
                        <Badge variant={isCompleted ? "default" : "secondary"}>
                          {checkedInCategory}/{categoryItems.length}
                        </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      {categoryItems.map((item, itemIdx) => {
                        const itemId = `${categoryKey}_${itemIdx}`;
                        const isChecked = checkedItems.has(itemId);
                        
                        return (
                          <div key={itemIdx} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                            <button
                              onClick={() => handleItemCheck(itemId, categoryKey)}
                              className="mt-0.5"
                            >
                              {isChecked ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <div className="h-4 w-4 rounded border-2 border-muted-foreground" />
                              )}
                            </button>
                            <span className={`text-sm ${isChecked ? 'line-through text-muted-foreground' : ''}`}>
                              {item}
                            </span>
                          </div>
                        );
                      })}
                      
                      {!isCompleted && checkedInCategory < categoryItems.length && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleMarkCategoryComplete(categoryKey)}
                          className="ml-7 mt-2"
                        >
                          Mark All Complete
                        </Button>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          {progressPercentage === 100 && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Great job!</strong> You've completed all signup preparation items. 
              You're ready to register when camp details are announced. No document uploads required.
            </AlertDescription>
          </Alert>
          )}
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Recommended Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <Badge variant="outline">4-6 weeks before</Badge>
                    <div>
                      <p className="font-medium">Start General Preparation</p>
                      <p className="text-sm text-muted-foreground">
                        Organize child information, set up payment authorization, prepare account
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Badge variant="outline">2-3 weeks before</Badge>
                    <div>
                      <p className="font-medium">Research Signup Requirements</p>
                      <p className="text-sm text-muted-foreground">
                        Once announced, research signup info and payment deadlines (no documents needed)
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Badge variant="outline">1 week before</Badge>
                    <div>
                      <p className="font-medium">Final Verification</p>
                      <p className="text-sm text-muted-foreground">
                        Test account access, verify payment authorization, confirm signup strategy
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Badge variant="default">Registration Day</Badge>
                    <div>
                      <p className="font-medium">Execute Signup</p>
                      <p className="text-sm text-muted-foreground">
                        We handle the signup submission and payment authorization when registration opens
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  if (!showAsCard) {
    return <div className="w-full">{content}</div>;
  }

  return (
    <Card>
      <CardContent className="p-6">
        {content}
      </CardContent>
    </Card>
  );
}