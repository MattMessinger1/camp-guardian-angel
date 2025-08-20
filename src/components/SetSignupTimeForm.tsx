import React, { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Clock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const signupTimeSchema = z.object({
  date: z.date({
    message: 'Signup date is required',
  }),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Time must be in HH:MM format (24-hour)',
  }),
});

type SignupTimeForm = z.infer<typeof signupTimeSchema>;

interface SetSignupTimeFormProps {
  sessionId: string;
  sessionName: string;
  onSuccess: () => void;
}

export function SetSignupTimeForm({ sessionId, sessionName, onSuccess }: SetSignupTimeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<SignupTimeForm>({
    resolver: zodResolver(signupTimeSchema),
    defaultValues: {
      time: '09:00',
    },
  });

  const onSubmit = async (data: SignupTimeForm) => {
    setIsSubmitting(true);
    
    try {
      // Combine date and time into a single datetime
      const [hours, minutes] = data.time.split(':').map(Number);
      const signupDateTime = new Date(data.date);
      signupDateTime.setHours(hours, minutes, 0, 0);

      console.log('Setting signup time:', signupDateTime.toISOString());

      // Update the session in the database
      const { error } = await supabase
        .from('sessions')
        .update({
          registration_open_at: signupDateTime.toISOString(),
        })
        .eq('id', sessionId);

      if (error) {
        console.error('Error updating signup time:', error);
        throw error;
      }

      toast({
        title: 'Signup Time Set',
        description: `Registration opens on ${format(signupDateTime, 'PPP')} at ${data.time}`,
      });

      onSuccess();
    } catch (error) {
      console.error('Failed to set signup time:', error);
      toast({
        title: 'Error',
        description: 'Failed to set signup time. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-800">
          <Clock className="w-5 h-5" />
          Set Signup Time
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            <strong>{sessionName}</strong> is missing a signup time. Please set when registration opens to continue with readiness assessment.
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date Picker */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Signup Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>Pick signup date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className={cn('p-3 pointer-events-auto')}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Time Input */}
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Signup Time (24-hour format)</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                        className="w-full"
                        placeholder="09:00"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-3">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? 'Setting...' : 'Set Signup Time'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}