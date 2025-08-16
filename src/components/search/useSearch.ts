import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ActivityResult } from './types';

export function useSearch() {
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [ageMin, setAgeMin] = useState<number | null>(null);
  const [ageMax, setAgeMax] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [priceMax, setPriceMax] = useState<number | null>(null);
  const [availability, setAvailability] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ActivityResult[]>([]);
  const [meta, setMeta] = useState<{ elapsed?: number; cached?: boolean }>({});

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (city) p.set('city', city);
    if (state) p.set('state', state);
    if (ageMin !== null) p.set('age_min', String(ageMin));
    if (ageMax !== null) p.set('age_max', String(ageMax));
    if (dateFrom) p.set('date_from', dateFrom);
    if (dateTo) p.set('date_to', dateTo);
    if (priceMax !== null) p.set('price_max', String(priceMax));
    if (availability) p.set('availability', availability);
    p.set('page', String(page));
    p.set('limit', '20');
    return p.toString();
  }, [q, city, state, ageMin, ageMax, dateFrom, dateTo, priceMax, availability, page]);

  const run = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`https://ezvwyfqtyanwnoyymhav.supabase.co/functions/v1/search?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'search_failed');
      setItems(json.items ?? []);
      setMeta(json.meta ?? {});
    } catch (e:any) {
      setError(e.message ?? 'search_failed');
      setItems([]);
      setMeta({});
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { /* initial no-op */ }, []);

  return { 
    q, setQ, 
    city, setCity, 
    state, setState,
    ageMin, setAgeMin,
    ageMax, setAgeMax,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    priceMax, setPriceMax,
    availability, setAvailability,
    page, setPage, 
    loading, error, items, meta, run 
  };
}