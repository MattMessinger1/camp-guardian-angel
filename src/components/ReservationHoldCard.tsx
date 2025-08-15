import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

interface ReservationHold {
  id: string
  session_id: string
  status: 'active' | 'expired' | 'converted' | 'cancelled'
  child_age_bracket?: string
  child_initials?: string
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

interface ReservationHoldCardProps {
  hold: ReservationHold
  onUpdate?: () => void
}

export const ReservationHoldCard: React.FC<ReservationHoldCardProps> = ({ 
  hold, 
  onUpdate 
}) => {
  const { toast } = useToast()
  const [timeRemaining, setTimeRemaining] = useState<number>(hold.time_remaining_ms || 0)
  const [isConverting, setIsConverting] = useState(false)

  // Update countdown timer
  useEffect(() => {
    if (hold.status !== 'active' || timeRemaining <= 0) return

    const interval = setInterval(() => {
      const remaining = new Date(hold.hold_expires_at).getTime() - Date.now()
      setTimeRemaining(Math.max(0, remaining))
      
      if (remaining <= 0 && onUpdate) {
        onUpdate() // Refresh the parent to update status
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [hold.hold_expires_at, hold.status, timeRemaining, onUpdate])

  const formatTimeRemaining = (ms: number): string => {
    if (ms <= 0) return 'Expired'
    
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    }
    return `${seconds}s`
  }

  const getStatusBadge = () => {
    switch (hold.status) {
      case 'active':
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Active - {formatTimeRemaining(timeRemaining)}
          </Badge>
        )
      case 'expired':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Expired
          </Badge>
        )
      case 'converted':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Converted to Registration
          </Badge>
        )
      case 'cancelled':
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Cancelled
          </Badge>
        )
      default:
        return <Badge variant="outline">{hold.status}</Badge>
    }
  }

  const handleConvertToRegistration = async () => {
    setIsConverting(true)
    
    try {
      const { data, error } = await supabase.functions.invoke('convert-hold-to-registration', {
        body: { 
          hold_id: hold.id 
        },
        headers: {
          'x-idempotency-key': `convert-${hold.id}-${Date.now()}`
        }
      })

      if (error) {
        throw error
      }

      toast({
        title: "Hold Converted",
        description: "Your hold has been converted to a registration. You'll be notified of the outcome.",
      })

      if (onUpdate) onUpdate()

    } catch (error: any) {
      console.error('Error converting hold:', error)
      toast({
        title: "Conversion Failed",
        description: error.message || "Failed to convert hold to registration",
        variant: "destructive"
      })
    } finally {
      setIsConverting(false)
    }
  }

  const isExpiringSoon = timeRemaining > 0 && timeRemaining < 300000 // Less than 5 minutes

  return (
    <Card className={`${isExpiringSoon ? 'border-orange-200 bg-orange-50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">
              {hold.sessions?.title || 'Session Hold'}
            </CardTitle>
            <CardDescription>
              {hold.sessions?.location && (
                <span className="block">{hold.sessions.location}</span>
              )}
              {hold.child_initials && (
                <span className="text-sm">Child: {hold.child_initials}</span>
              )}
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {hold.sessions?.start_at && (
          <div className="text-sm text-muted-foreground">
            <strong>Session:</strong> {new Date(hold.sessions.start_at).toLocaleDateString()} 
            {hold.sessions.end_at && (
              ` - ${new Date(hold.sessions.end_at).toLocaleDateString()}`
            )}
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          <strong>Hold Created:</strong> {new Date(hold.created_at).toLocaleString()}
        </div>

        {hold.child_age_bracket && (
          <div className="text-sm text-muted-foreground">
            <strong>Age Group:</strong> {hold.child_age_bracket.replace('_', '-').replace('to', ' to ')}
          </div>
        )}

        {isExpiringSoon && hold.status === 'active' && (
          <div className="flex items-center gap-2 p-3 bg-orange-100 border border-orange-200 rounded-md">
            <AlertCircle className="w-4 h-4 text-orange-600" />
            <span className="text-sm text-orange-800">
              This hold expires soon! Convert to registration to secure your spot.
            </span>
          </div>
        )}

        {hold.status === 'active' && (
          <div className="flex gap-2">
            <Button 
              onClick={handleConvertToRegistration}
              disabled={isConverting || timeRemaining <= 0}
              className="flex-1"
            >
              {isConverting ? 'Converting...' : 'Convert to Registration'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ReservationHoldCard