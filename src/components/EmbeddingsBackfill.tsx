import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Zap } from "lucide-react"

export const EmbeddingsBackfill: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<any>(null)
  const { toast } = useToast()

  const runBackfill = async () => {
    setIsRunning(true)
    setResult(null)

    try {
      const { data, error } = await supabase.functions.invoke('backfill-embeddings', {
        body: {}
      })

      if (error) throw error

      setResult(data)
      toast({
        title: "Embeddings Backfill Complete",
        description: `Processed ${data.processed} activities successfully`,
      })

    } catch (error) {
      console.error('Backfill failed:', error)
      toast({
        title: "Backfill Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Embeddings Backfill
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Generate OpenAI embeddings for activities that don't have them yet.
        </p>
        
        <Button 
          onClick={runBackfill} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            'Run Backfill'
          )}
        </Button>

        {result && (
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm">
              <strong>Success!</strong> Processed {result.processed} activities.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}