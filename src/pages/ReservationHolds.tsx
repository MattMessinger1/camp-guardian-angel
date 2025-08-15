import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Clock, Database, Zap, FileText } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import ReservationHoldCard from '@/components/ReservationHoldCard'

interface ReservationHold {
  id: string
  session_id: string
  status: 'active' | 'expired' | 'converted' | 'cancelled'
  child_age_bracket?: string
  child_initials?: string
  parent_email?: string
  hold_expires_at: string
  created_at: string
  sessions?: {
    id: string
    title: string
    location: string
    start_at: string
    end_at: string
  }
  time_remaining_ms?: number
}

const ReservationHoldsPage: React.FC = () => {
  const { toast } = useToast()
  const [holds, setHolds] = useState<ReservationHold[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  
  // Demo create hold form
  const [createForm, setCreateForm] = useState({
    session_id: '',
    child_age_bracket: '',
    child_initials: '',
    parent_email: '',
    hold_duration_minutes: 15
  })

  const fetchHolds = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-reservation-holds', {
        body: filter !== 'all' ? { status: filter } : {}
      })

      if (error) throw error

      setHolds(data.holds || [])
    } catch (error: any) {
      console.error('Error fetching holds:', error)
      toast({
        title: "Error",
        description: "Failed to fetch reservation holds",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHolds()
  }, [filter])

  const handleCreateHold = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!createForm.session_id) {
      toast({
        title: "Error",
        description: "Please enter a session ID",
        variant: "destructive"
      })
      return
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-reservation-hold', {
        body: {
          ...createForm,
          child_age_bracket: createForm.child_age_bracket || undefined
        },
        headers: {
          'x-idempotency-key': `create-${Date.now()}-${Math.random()}`
        }
      })

      if (error) throw error

      toast({
        title: "Hold Created",
        description: `Reservation hold created successfully. Expires in ${createForm.hold_duration_minutes} minutes.`,
      })

      // Reset form
      setCreateForm({
        session_id: '',
        child_age_bracket: '',
        child_initials: '',
        parent_email: '',
        hold_duration_minutes: 15
      })

      // Refresh holds
      fetchHolds()

    } catch (error: any) {
      console.error('Error creating hold:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to create reservation hold",
        variant: "destructive"
      })
    }
  }

  const filteredHolds = holds.filter(hold => {
    if (filter === 'all') return true
    return hold.status === filter
  })

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Phase 0 Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Phase 0: Reservation Holds</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Secure, COPPA-compliant reservation hold system with data minimization, 
          automatic TTL cleanup, and comprehensive security measures.
        </p>
      </div>

      {/* Security Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 text-center">
            <Shield className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <h3 className="font-semibold text-green-800">COPPA Compliant</h3>
            <p className="text-sm text-green-600">Age brackets instead of full DOB</p>
          </CardContent>
        </Card>
        
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 text-center">
            <Database className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <h3 className="font-semibold text-blue-800">Data Minimization</h3>
            <p className="text-sm text-blue-600">Store only what's needed</p>
          </CardContent>
        </Card>
        
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 text-purple-600" />
            <h3 className="font-semibold text-purple-800">Auto TTL Cleanup</h3>
            <p className="text-sm text-purple-600">30-90 day data retention</p>
          </CardContent>
        </Card>
        
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4 text-center">
            <Zap className="w-8 h-8 mx-auto mb-2 text-orange-600" />
            <h3 className="font-semibold text-orange-800">Rate Limited</h3>
            <p className="text-sm text-orange-600">Abuse prevention built-in</p>
          </CardContent>
        </Card>
      </div>

      {/* Privacy Policy Notice */}
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          <strong>Privacy Notice:</strong> This system implements data minimization principles. 
          We only collect essential information needed for reservations and automatically delete 
          data after the retention period. Full Privacy Policy and Terms of Service should be 
          published before production use.
        </AlertDescription>
      </Alert>

      {/* Create Hold Form */}
      <Card>
        <CardHeader>
          <CardTitle>Create Demo Reservation Hold</CardTitle>
          <CardDescription>
            Test the reservation hold system with minimal data collection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateHold} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Session ID *</label>
                <Input
                  data-testid="reserve-session-id"
                  value={createForm.session_id}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, session_id: e.target.value }))}
                  placeholder="Enter session UUID"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Child Age Bracket</label>
                <Select
                  data-testid="reserve-age"
                  value={createForm.child_age_bracket}
                  onValueChange={(value) => setCreateForm(prev => ({ ...prev, child_age_bracket: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select age bracket" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="under_5">Under 5</SelectItem>
                    <SelectItem value="5_to_8">5 to 8</SelectItem>
                    <SelectItem value="9_to_12">9 to 12</SelectItem>
                    <SelectItem value="13_to_17">13 to 17</SelectItem>
                    <SelectItem value="18_plus">18+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Child Initials (max 3 chars)</label>
                <Input
                  value={createForm.child_initials}
                  onChange={(e) => setCreateForm(prev => ({ 
                    ...prev, 
                    child_initials: e.target.value.slice(0, 3).toUpperCase() 
                  }))}
                  placeholder="ABC"
                  maxLength={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Parent Email</label>
                <Input
                  data-testid="reserve-email"
                  type="email"
                  value={createForm.parent_email}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, parent_email: e.target.value }))}
                  placeholder="parent@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Hold Duration (minutes)</label>
                <Input
                  type="number"
                  value={createForm.hold_duration_minutes}
                  onChange={(e) => setCreateForm(prev => ({ 
                    ...prev, 
                    hold_duration_minutes: parseInt(e.target.value) || 15 
                  }))}
                  min={1}
                  max={60}
                />
              </div>
            </div>
            
            <Button data-testid="reserve-submit" type="submit" className="w-full">
              Create Reservation Hold
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Filter and Display Holds */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Your Reservation Holds</h2>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Holds</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchHolds} variant="outline">
              Refresh
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading holds...</div>
        ) : filteredHolds.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No reservation holds found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredHolds.map(hold => (
              <ReservationHoldCard 
                key={hold.id} 
                hold={hold} 
                onUpdate={fetchHolds}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ReservationHoldsPage