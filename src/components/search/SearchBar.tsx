import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import FacetChips from './FacetChips';
import { parseSearchQuery } from '@/lib/ai/parseSearchQuery';

type Props = {
  q: string; setQ: (v:string)=>void;
  city: string; setCity: (v:string)=>void;
  state: string; setState: (v:string)=>void;
  ageMin: number|null; setAgeMin: (v:number|null)=>void;
  ageMax: number|null; setAgeMax: (v:number|null)=>void;
  dateFrom: string; setDateFrom: (v:string)=>void;
  dateTo: string; setDateTo: (v:string)=>void;
  priceMax: number|null; setPriceMax: (v:number|null)=>void;
  availability: string; setAvailability: (v:string)=>void;
  onSearch: () => void;
};

export default function SearchBar(p: Props) {
  const [isLoading, setIsLoading] = useState(false);

  // Generate facet chips from active filters
  const facetChips = [
    ...(p.ageMin !== null || p.ageMax !== null ? [{
      label: `Age ${p.ageMin || ''}${p.ageMin && p.ageMax ? '-' : ''}${p.ageMax || ''}`,
      value: `${p.ageMin || ''}-${p.ageMax || ''}`,
      onRemove: () => { p.setAgeMin(null); p.setAgeMax(null); }
    }] : []),
    ...(p.dateFrom ? [{
      label: `From ${p.dateFrom}`,
      value: p.dateFrom,
      onRemove: () => p.setDateFrom('')
    }] : []),
    ...(p.dateTo ? [{
      label: `To ${p.dateTo}`,
      value: p.dateTo,
      onRemove: () => p.setDateTo('')
    }] : []),
    ...(p.priceMax !== null ? [{
      label: `Under $${p.priceMax}`,
      value: p.priceMax,
      onRemove: () => p.setPriceMax(null)
    }] : []),
    ...(p.availability ? [{
      label: `${p.availability} availability`,
      value: p.availability,
      onRemove: () => p.setAvailability('')
    }] : []),
    ...(p.city ? [{
      label: `${p.city}`,
      value: p.city,
      onRemove: () => p.setCity('')
    }] : []),
    ...(p.state ? [{
      label: `${p.state}`,
      value: p.state,
      onRemove: () => p.setState('')
    }] : [])
  ];

  const clearAllFilters = () => {
    p.setAgeMin(null);
    p.setAgeMax(null);
    p.setDateFrom('');
    p.setDateTo('');
    p.setPriceMax(null);
    p.setAvailability('');
    p.setCity('');
    p.setState('');
  };

  const handleSearch = async () => {
    if (!p.q.trim()) {
      p.onSearch();
      return;
    }

    setIsLoading(true);
    try {
      // Try to parse natural language query
      const parsed = await parseSearchQuery(p.q);
      
      // Auto-populate filters from parsed query
      if (parsed.location) {
        const locationParts = parsed.location.split(',');
        if (locationParts.length >= 2) {
          p.setCity(locationParts[0].trim());
          p.setState(locationParts[1].trim());
        } else {
          p.setCity(parsed.location);
        }
      }
      
      if (parsed.ageGroup) {
        const ageMatch = parsed.ageGroup.match(/(\d+)(?:-(\d+))?/);
        if (ageMatch) {
          p.setAgeMin(parseInt(ageMatch[1]));
          if (ageMatch[2]) {
            p.setAgeMax(parseInt(ageMatch[2]));
          }
        }
      }
      
      // Keep the original query in the search field for broader search
      p.onSearch();
    } catch (error) {
      // If parsing fails, just search with the original query
      p.onSearch();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {/* Simplified single search bar */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input 
              className="w-full pl-12 pr-4 py-4 text-lg border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm" 
              placeholder="Soccer camp in Austin, TX for July 2024..."
              value={p.q} 
              onChange={e=>p.setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button 
            onClick={handleSearch}
            disabled={isLoading}
            className="px-8 py-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-semibold shadow-sm disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              'Search'
            )}
          </button>
        </div>
        
        {/* Example queries */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">Try examples:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              "Soccer camp in Austin, TX for July 2024",
              "Basketball camp near Seattle summer session", 
              "Art camp in Los Angeles for ages 8-12"
            ].map((example, index) => (
              <button
                key={index}
                type="button"
                onClick={() => p.setQ(example)}
                className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Facet chips */}
      <FacetChips chips={facetChips} onClearAll={clearAllFilters} />
    </div>
  );
}