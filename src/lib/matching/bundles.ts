import { matchWeek } from './weekOf';

export interface CandidateLike {
  id: string;
  start_at?: string | null;
}

interface SortOptions {
  priorityRankMap?: Record<string, number | null | undefined>;
  weekOfISO?: string | Date;
  tz?: string;
  offsetDays?: number;
}

export function sortCandidates<T extends CandidateLike>(
  cands: T[],
  { priorityRankMap = {}, weekOfISO, tz = 'America/Chicago', offsetDays = 0 }: SortOptions = {}
): T[] {
  const arr = [...(cands || [])];

  const getRank = (id: string): number | null | undefined => priorityRankMap[id];
  const toTime = (iso?: string | null): number => {
    if (!iso) return Number.POSITIVE_INFINITY;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? Number.POSITIVE_INFINITY : d.getTime();
  };

  return arr.sort((a, b) => {
    const aStart = toTime(a.start_at || null);
    const bStart = toTime(b.start_at || null);

    // 1) matchWeek DESC
    if (weekOfISO) {
      const aMatch = matchWeek(weekOfISO, a.start_at || '', tz, offsetDays) ? 1 : 0;
      const bMatch = matchWeek(weekOfISO, b.start_at || '', tz, offsetDays) ? 1 : 0;
      if (aMatch !== bMatch) return bMatch - aMatch; // true first
    }

    // 2) priorityRank ASC (nulls last)
    const aRank = getRank(a.id);
    const bRank = getRank(b.id);

    const aRankNull = aRank === null || aRank === undefined;
    const bRankNull = bRank === null || bRank === undefined;

    if (aRankNull !== bRankNull) {
      return aRankNull ? 1 : -1; // nulls last
    }
    if (!aRankNull && !bRankNull && aRank! !== bRank!) {
      return (aRank as number) - (bRank as number);
    }

    // 3) start_at ASC
    if (aStart !== bStart) return aStart - bStart;

    // Stable fallback by id
    return a.id.localeCompare(b.id);
  });
}
