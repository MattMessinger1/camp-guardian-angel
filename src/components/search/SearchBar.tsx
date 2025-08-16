import React from 'react';

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
  return (
    <div className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-border">
      <div className="max-w-6xl mx-auto px-4 py-3 space-y-3">
        {/* Primary search row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input 
            className="border border-border rounded-lg p-2 md:col-span-2 bg-background text-foreground" 
            placeholder="Search camps or activities"
            value={p.q} 
            onChange={e=>p.setQ(e.target.value)} 
          />
          <input 
            className="border border-border rounded-lg p-2 bg-background text-foreground" 
            placeholder="City"
            value={p.city} 
            onChange={e=>p.setCity(e.target.value)} 
          />
          <input 
            className="border border-border rounded-lg p-2 bg-background text-foreground" 
            placeholder="State"
            value={p.state} 
            onChange={e=>p.setState(e.target.value)} 
          />
        </div>
        
        {/* Filters row */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <div className="flex gap-1">
            <input 
              className="border border-border rounded-lg p-2 bg-background text-foreground flex-1" 
              placeholder="Age min"
              type="number"
              value={p.ageMin ?? ''} 
              onChange={e=>p.setAgeMin(e.target.value ? parseInt(e.target.value) : null)} 
            />
            <input 
              className="border border-border rounded-lg p-2 bg-background text-foreground flex-1" 
              placeholder="Age max"
              type="number"
              value={p.ageMax ?? ''} 
              onChange={e=>p.setAgeMax(e.target.value ? parseInt(e.target.value) : null)} 
            />
          </div>
          <input 
            className="border border-border rounded-lg p-2 bg-background text-foreground" 
            type="date" 
            placeholder="From date"
            value={p.dateFrom} 
            onChange={e=>p.setDateFrom(e.target.value)} 
          />
          <input 
            className="border border-border rounded-lg p-2 bg-background text-foreground" 
            type="date" 
            placeholder="To date"
            value={p.dateTo} 
            onChange={e=>p.setDateTo(e.target.value)} 
          />
          <input 
            className="border border-border rounded-lg p-2 bg-background text-foreground" 
            placeholder="Max price"
            type="number"
            value={p.priceMax ?? ''} 
            onChange={e=>p.setPriceMax(e.target.value ? parseFloat(e.target.value) : null)} 
          />
          <select 
            className="border border-border rounded-lg p-2 bg-background text-foreground" 
            value={p.availability} 
            onChange={e=>p.setAvailability(e.target.value)}
          >
            <option value="">Any availability</option>
            <option value="open">Open</option>
            <option value="limited">Limited</option>
            <option value="waitlist">Waitlist</option>
            <option value="full">Full</option>
          </select>
          <button 
            onClick={p.onSearch} 
            className="px-4 py-2 rounded-lg border border-border shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Search
          </button>
        </div>
      </div>
    </div>
  );
}