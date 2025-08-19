import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"

interface SmartSearchBarProps {
  className?: string
}

export const SmartSearchBar: React.FC<SmartSearchBarProps> = ({ className }) => {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!query.trim()) return

    // Navigate directly to results page - let the backend handle query parsing
    navigate(`/search/results?q=${encodeURIComponent(query)}`)
  }

  return (
    <div className={cn("w-full", className)}>
      <div 
        className="bg-white rounded-2xl p-3 relative z-10"
        style={{ 
          backgroundColor: '#ffffff !important',
          border: '2px solid #E5E7EB !important',
          borderRadius: '16px !important',
          padding: '12px !important',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1) !important',
          position: 'relative',
          zIndex: 10
        }}
      >
        <form onSubmit={handleSubmit} className="flex h-16">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Activity name, city/state, session dates..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-4 h-16 text-base border-0 focus:ring-0 focus:border-0 bg-transparent placeholder:text-gray-500"
            />
          </div>
          
          <Button 
            type="submit" 
            disabled={!query.trim()}
            className="h-16 w-35 rounded-none font-bold bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
            style={{ width: '140px' }}
          >
            Search
          </Button>
        </form>
      </div>
      
    </div>
  )
}