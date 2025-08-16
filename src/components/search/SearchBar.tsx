import React from 'react';
import { Search } from 'lucide-react';
import FacetChips from './FacetChips';

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

  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
      <div className="max-w-6xl mx-auto px-4 py-3 space-y-3">
        {/* Primary search row - mobile first */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" 
              placeholder="Search camps, sports, activities..."
              value={p.q} 
              onChange={e=>p.setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && p.onSearch()}
            />
          </div>
          <button 
            onClick={p.onSearch} 
            className="px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium shadow-sm"
          >
            Search
          </button>
        </div>
        
        {/* Filters row - mobile responsive */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <div className="flex gap-1">
            <input 
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/20" 
              placeholder="Min age"
              type="number"
              min="3"
              max="18"
              value={p.ageMin ?? ''} 
              onChange={e=>p.setAgeMin(e.target.value ? parseInt(e.target.value) : null)} 
            />
            <input 
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/20" 
              placeholder="Max age"
              type="number"
              min="3"
              max="18"
              value={p.ageMax ?? ''} 
              onChange={e=>p.setAgeMax(e.target.value ? parseInt(e.target.value) : null)} 
            />
          </div>
          
          <input 
            className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/20" 
            type="date" 
            title="Start date"
            value={p.dateFrom} 
            onChange={e=>p.setDateFrom(e.target.value)} 
          />
          <input 
            className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/20" 
            type="date" 
            title="End date"
            value={p.dateTo} 
            onChange={e=>p.setDateTo(e.target.value)} 
          />
          
          <input 
            className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/20" 
            placeholder="Max price ($)"
            type="number"
            min="0"
            step="50"
            value={p.priceMax ?? ''} 
            onChange={e=>p.setPriceMax(e.target.value ? parseFloat(e.target.value) : null)} 
          />
          
          <div className="flex gap-2 col-span-2 sm:col-span-3 lg:col-span-1">
            <input 
              className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/20" 
              placeholder="City"
              value={p.city} 
              onChange={e=>p.setCity(e.target.value)} 
            />
            <input 
              className="w-20 px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/20" 
              placeholder="State"
              maxLength={2}
              value={p.state} 
              onChange={e=>p.setState(e.target.value.toUpperCase())} 
            />
          </div>
          
          <select 
            className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/20 col-span-2 sm:col-span-3 lg:col-span-1" 
            value={p.availability} 
            onChange={e=>p.setAvailability(e.target.value)}
          >
            <option value="">Any availability</option>
            <option value="open">Open spots</option>
            <option value="limited">Limited spots</option>
            <option value="waitlist">Waitlist only</option>
          </select>
        </div>
      </div>
      
      {/* Facet chips */}
      <FacetChips chips={facetChips} onClearAll={clearAllFilters} />
    </div>
  );
}