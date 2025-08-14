import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/ui/empty-state"
import { Search, Loader2, AlertCircle } from "lucide-react"
import { parseSearchQuery } from "@/lib/ai/parseSearchQuery"
import { cn } from "@/lib/utils"

interface SmartSearchBarProps {
  className?: string
}

export const SmartSearchBar: React.FC<SmartSearchBarProps> = ({ className }) => {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!query.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const parsedQuery = await parseSearchQuery(query)
      
      // Navigate to ConfirmCamp page with parsed data
      navigate('/confirm-camp', { 
        state: { 
          searchQuery: query,
          parsedData: parsedQuery 
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse search query')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetry = () => {
    setError(null)
    setQuery('')
  }

  if (error) {
    return (
      <div className={cn("w-full max-w-2xl mx-auto", className)}>
        <EmptyState
          icon={<AlertCircle className="h-12 w-12" />}
          title="Unable to parse your search"
          message={error}
          actionLabel="Try Again"
          onAction={handleRetry}
        />
      </div>
    )
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="bg-white rounded-2xl p-3" style={{ border: '2px solid #E5E7EB' }}>
        <form onSubmit={handleSubmit} className="flex h-16">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Activity name, city/state, session dates..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isLoading}
              className="pl-10 pr-4 h-16 text-base border-0 focus:ring-0 focus:border-0 bg-transparent placeholder:text-gray-500"
            />
          </div>
          
          <Button 
            type="submit" 
            disabled={!query.trim() || isLoading}
            className="h-16 w-35 rounded-none font-bold bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
            style={{ width: '140px' }}
          >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Searching...
            </>
          ) : (
            "Search"
          )}
          </Button>
        </form>
      </div>
      
      {/* Example queries */}
      <div className="mt-4 text-center">
        <p className="text-sm text-muted-foreground mb-2">Try examples:</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {[
            "Soccer camp in Austin, TX for July 2024",
            "Basketball camp near Seattle summer session",
            "Art camp in Los Angeles for ages 8-12"
          ].map((example, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setQuery(example)}
              className="text-xs px-3 py-1 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}