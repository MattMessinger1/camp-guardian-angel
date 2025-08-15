import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ActivityResult } from './types';

export function useSearch() {
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');
  const [platform, setPlatform] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ActivityResult[]>([]);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (city) p.set('city', city);
    if (start) p.set('start', start);
    if (end) p.set('end', end);
    if (platform) p.set('platform', platform);
    p.set('page', String(page));
    p.set('limit', '20');
    return p.toString();
  }, [q, city, start, end, platform, page]);

  const run = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`https://ezvwyfqtyanwnoyymhav.supabase.co/functions/v1/search?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'search_failed');
      setItems(json.items ?? []);
    } catch (e:any) {
      setError(e.message ?? 'search_failed');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { /* initial no-op */ }, []);

  return { q, setQ, city, setCity, start, setStart, end, setEnd, platform, setPlatform, page, setPage, loading, error, items, run };
}