export type ParsedQuery = {
  text: string;
  location: { city?: string; state?: string; zip?: string } | null;
  timeWindowDays?: number;
};

const CITY_WORDS = new Set([
  "madison","middleton","verona","fitchburg","monona",
  "milwaukee","chicago","new york","brooklyn","queens"
]);
const STATE_ABBR = new Set(["wi","il","ny","mn","mi","ia"]);

export function parseQuery(q: string): ParsedQuery {
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  let city: string | undefined, state: string | undefined, zip: string | undefined;
  for (const t of tokens) {
    if (/^\d{5}$/.test(t)) zip = t;
    if (STATE_ABBR.has(t)) state = t.toUpperCase();
    if (CITY_WORDS.has(t)) city = t.replace(/\b\w/g, m => m.toUpperCase());
  }
  const cleaned = tokens
    .filter(t => !CITY_WORDS.has(t) && !STATE_ABBR.has(t) && !/^\d{5}$/.test(t))
    .join(" ");
  return { text: cleaned.trim(), location: (city||state||zip) ? {city,state,zip} : null };
}