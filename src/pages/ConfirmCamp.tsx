import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { ArrowLeft, MapPin, Calendar, Users, CheckCircle } from "lucide-react"
import { formatParsedQuery, type ParsedSearchQuery } from "@/lib/ai/parseSearchQuery"

interface LocationState {
  searchQuery: string
  parsedData: ParsedSearchQuery
}

const ConfirmCampPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as LocationState

  // Redirect if no state data
  if (!state || !state.parsedData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <EmptyState
          title="No search data found"
          message="Please start a new search to find camps."
          actionLabel="Start Search"
          onAction={() => navigate('/')}
        />
      </div>
    )
  }

  const { searchQuery, parsedData } = state

  const handleBack = () => {
    navigate('/')
  }

  const handleConfirm = () => {
    // TODO: Navigate to next step in the flow
    console.log('Confirming camp search:', parsedData)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={handleBack}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Search
          </Button>
          
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Confirm Your Camp Search
          </h1>
          <p className="text-muted-foreground">
            We've analyzed your search. Please review and confirm the details below.
          </p>
        </div>

        {/* Original Query */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Your Search</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground bg-muted p-3 rounded-lg font-mono text-sm">
              "{searchQuery}"
            </p>
          </CardContent>
        </Card>

        {/* Parsed Results */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              What We Found
              <Badge variant="secondary" className="ml-auto">
                {Math.round(parsedData.confidence * 100)}% confidence
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {parsedData.campType && (
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <CheckCircle className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Camp Type</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {parsedData.campType} camp
                    </p>
                  </div>
                </div>
              )}

              {parsedData.location && (
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">
                      {parsedData.location}
                    </p>
                  </div>
                </div>
              )}

              {parsedData.timeframe && (
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Timeframe</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {parsedData.timeframe}
                    </p>
                  </div>
                </div>
              )}

              {parsedData.ageGroup && (
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Age Group</p>
                    <p className="text-sm text-muted-foreground">
                      {parsedData.ageGroup}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {parsedData.campName && (
              <div className="border-t pt-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <CheckCircle className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Specific Camp</p>
                    <p className="text-sm text-muted-foreground">
                      {parsedData.campName}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground mb-4">
              Summary: <span className="text-foreground font-medium">
                {formatParsedQuery(parsedData)}
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            variant="outline" 
            onClick={handleBack}
            className="min-w-[200px]"
          >
            Modify Search
          </Button>
          <Button 
            onClick={handleConfirm}
            className="min-w-[200px] hero-gradient"
          >
            Looks Good - Continue
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmCampPage