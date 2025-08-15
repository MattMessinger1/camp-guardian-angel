import React from 'react';

type Props = {
  q: string; setQ: (v:string)=>void;
  city: string; setCity: (v:string)=>void;
  start: string; setStart: (v:string)=>void;
  end: string; setEnd: (v:string)=>void;
  platform: string; setPlatform: (v:string)=>void;
  onSearch: () => void;
};

export default function SearchBar(p: Props) {
  return (
    <div className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-border">
      <div className="max-w-5xl mx-auto px-4 py-3 grid grid-cols-1 md:grid-cols-5 gap-2">
        <input className="border border-border rounded-lg p-2 md:col-span-2 bg-background text-foreground" placeholder="Search camps or activities"
          value={p.q} onChange={e=>p.setQ(e.target.value)} />
        <input className="border border-border rounded-lg p-2 bg-background text-foreground" placeholder="City (e.g., Madison)"
          value={p.city} onChange={e=>p.setCity(e.target.value)} />
        <input className="border border-border rounded-lg p-2 bg-background text-foreground" type="date" value={p.start} onChange={e=>p.setStart(e.target.value)} />
        <input className="border border-border rounded-lg p-2 bg-background text-foreground" type="date" value={p.end} onChange={e=>p.setEnd(e.target.value)} />
        <div className="flex gap-2 md:col-span-5">
          <select className="border border-border rounded-lg p-2 bg-background text-foreground" value={p.platform} onChange={e=>p.setPlatform(e.target.value)}>
            <option value="">Any platform</option>
            <option>Active</option><option>Sawyer</option><option>CampMinder</option><option>UltraCamp</option>
          </select>
          <button onClick={p.onSearch} className="ml-auto px-4 py-2 rounded-lg border border-border shadow-sm bg-background text-foreground hover:bg-accent">Search</button>
        </div>
      </div>
    </div>
  );
}