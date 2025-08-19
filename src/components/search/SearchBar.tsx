import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

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

  const handleSearch = async () => {
    if (!p.q.trim()) {
      p.onSearch();
      return;
    }

    setIsLoading(true);
    try {
      // Auto-populate location filters from query if it contains location info
      const locationMatch = p.q.match(/([a-zA-Z\s]+),\s*([A-Z]{2})/i);
      if (locationMatch) {
        p.setCity(locationMatch[1].trim());
        p.setState(locationMatch[2].trim());
      }
      
      p.onSearch();
    } catch (error) {
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
              placeholder="Activity / Camp name, city, dates..."
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
      </div>
    </div>
  );
}