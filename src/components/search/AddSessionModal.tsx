import React, { useState } from 'react'
import { Calendar, CalendarIcon, Plus, X } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface AddSessionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface SessionForm {
  campName: string
  date: Date | undefined
  providerLink: string
  notes: string
}

export const AddSessionModal: React.FC<AddSessionModalProps> = ({
  open,
  onOpenChange,
}) => {
  const [form, setForm] = useState<SessionForm>({
    campName: '',
    date: undefined,
    providerLink: '',
    notes: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Console log the payload for now
    console.log('Add Session Request:', {
      campName: form.campName,
      date: form.date?.toISOString(),
      providerLink: form.providerLink,
      notes: form.notes,
      timestamp: new Date().toISOString(),
    })

    // Reset form and close modal
    setForm({
      campName: '',
      date: undefined,
      providerLink: '',
      notes: '',
    })
    onOpenChange(false)

    // TODO: Send to backend queue later
  }

  const updateForm = (field: keyof SessionForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Session
          </DialogTitle>
          <DialogDescription>
            Tell us about a camp or session you'd like us to add. We'll review it and add it to our database.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Camp Name */}
          <div className="space-y-2">
            <Label htmlFor="campName">Camp/Program Name *</Label>
            <Input
              id="campName"
              type="text"
              placeholder="e.g., Summer Soccer Camp"
              value={form.campName}
              onChange={(e) => updateForm('campName', e.target.value)}
              required
            />
          </div>

          {/* Date Picker */}
          <div className="space-y-2">
            <Label>Session Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !form.date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.date ? format(form.date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={form.date}
                  onSelect={(date) => updateForm('date', date)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Provider Link */}
          <div className="space-y-2">
            <Label htmlFor="providerLink">Provider Website/Link *</Label>
            <Input
              id="providerLink"
              type="url"
              placeholder="https://example.com/summer-camp"
              value={form.providerLink}
              onChange={(e) => updateForm('providerLink', e.target.value)}
              required
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional details about age requirements, pricing, location, etc."
              value={form.notes}
              onChange={(e) => updateForm('notes', e.target.value)}
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={!form.campName || !form.date || !form.providerLink}
            >
              Submit Request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}