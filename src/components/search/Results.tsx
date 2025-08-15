import React, { useState } from 'react';
import type { ActivityResult, SessionItem } from './types';
import { format } from 'date-fns';
import { AddSessionModal } from './AddSessionModal';

function SessionRow({ s }: { s: SessionItem }) {
  const start = s.start ? format(new Date(s.start), "MMM d, p") : '';
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border border-border rounded-xl p-3 bg-card">
      <div className="text-sm">
        <div className="font-medium text-foreground">{start}</div>
        {s.end && <div className="text-xs text-muted-foreground">ends {format(new Date(s.end), "MMM d, p")}</div>}
      </div>
      <div className="text-sm text-foreground">Avail: {s.availability ?? '—'}</div>
      <div className="text-sm text-foreground">${s.price_min ?? '—'}</div>
      <span className="text-xs rounded-full border border-border px-2 py-1 text-muted-foreground">{s.platform ?? '—'}</span>
      <button className="px-3 py-1 rounded-lg border border-border bg-background text-foreground hover:bg-accent">Reserve</button>
    </div>
  );
}

function ActivityCard({ a }: { a: ActivityResult }) {
  return (
    <div className="rounded-2xl border border-border p-4 shadow-sm bg-card">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold text-foreground">{a.name}</h3>
        <div className="text-sm text-muted-foreground">{a.city}{a.state ? `, ${a.state}` : ''}</div>
      </div>
      <div className="mt-3 grid gap-2">
        {a.sessions.slice(0,3).map(s => <SessionRow key={s.id} s={s} />)}
        {a.sessions.length > 3 && <div className="text-sm text-muted-foreground">+ {a.sessions.length-3} more upcoming dates</div>}
      </div>
    </div>
  );
}

export default function Results({ items, loading, error }:{
  items: ActivityResult[];
  loading: boolean;
  error: string | null;
}) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  if (loading) return <div className="py-12 text-center text-foreground">Searching…</div>;
  if (error) return <div className="py-12 text-center text-destructive">{error}</div>;
  if (!items?.length) {
    return (
      <div className="py-8 text-center">
        <div className="font-medium mb-2 text-foreground">No results found</div>
        <p className="text-sm text-muted-foreground">Try broadening your dates or city. Or click "Add a session" to send us a link and we'll try to reserve it for you.</p>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="mt-3 px-4 py-2 rounded-lg border border-border bg-background text-foreground hover:bg-accent"
        >
          Add a session
        </button>
        
        <AddSessionModal 
          open={isAddModalOpen} 
          onOpenChange={setIsAddModalOpen} 
        />
      </div>
    );
  }
  return (
    <div className="grid gap-4">
      {items.map(a => <ActivityCard key={a.activity_id} a={a} />)}
    </div>
  );
}