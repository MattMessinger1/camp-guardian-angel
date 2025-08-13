import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ClarifyingQuestionsCardProps {
  questions: string[];
  onSubmit: (data: { childAge?: number; weekDate?: string }) => void;
}

export const ClarifyingQuestionsCard: React.FC<ClarifyingQuestionsCardProps> = ({
  questions,
  onSubmit
}) => {
  const [childAge, setChildAge] = useState<string>('');
  const [weekDate, setWeekDate] = useState<Date | undefined>();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data: { childAge?: number; weekDate?: string } = {};
    
    if (childAge.trim()) {
      const age = parseInt(childAge.trim());
      if (!isNaN(age) && age > 0 && age <= 18) {
        data.childAge = age;
      }
    }
    
    if (weekDate) {
      data.weekDate = weekDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    }
    
    onSubmit(data);
  };

  // Check if questions mention age or date
  const needsAge = questions.some(q => 
    q.toLowerCase().includes('age') || 
    q.toLowerCase().includes('old') ||
    q.toLowerCase().includes('child')
  );
  
  const needsDate = questions.some(q => 
    q.toLowerCase().includes('when') || 
    q.toLowerCase().includes('date') ||
    q.toLowerCase().includes('week') ||
    q.toLowerCase().includes('time')
  );

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <HelpCircle className="h-5 w-5 text-primary" />
          Help us find the perfect match
        </CardTitle>
        <CardDescription>
          {questions.length > 0 && (
            <div className="space-y-1">
              {questions.slice(0, 2).map((question, index) => (
                <div key={index} className="text-sm">• {question}</div>
              ))}
            </div>
          )}
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {needsAge && (
            <div className="space-y-2">
              <Label htmlFor="child-age">Child's Age</Label>
              <Input
                id="child-age"
                type="number"
                value={childAge}
                onChange={(e) => setChildAge(e.target.value)}
                placeholder="e.g., 8"
                min="1"
                max="18"
                className="w-32"
              />
            </div>
          )}

          {needsDate && (
            <div className="space-y-2">
              <Label>Preferred Week</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !weekDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {weekDate ? format(weekDate, "PPP") : <span>Pick a week</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={weekDate}
                    onSelect={setWeekDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex gap-2">
          <Button type="submit" className="flex-1">
            Refine Search
          </Button>
          <Button 
            type="button" 
            variant="outline"
            onClick={() => onSubmit({})}
          >
            Skip
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};