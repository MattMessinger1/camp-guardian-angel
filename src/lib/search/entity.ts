import type { RawResult } from "./types";

const STOP_PREFIX = /^(the)\s+/i;
const STOP_SUFFIX = /\b(club|inc|llc|ltd|co|company|assn|association)\b/gi;

export function normalizeName(name: string): string {
  return name.toLowerCase()
    .replace(STOP_PREFIX, "")
    .replace(STOP_SUFFIX, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSetSim(a: string, b: string): number {
  const A = new Set(a.split(" ")), B = new Set(b.split(" "));
  const inter = [...A].filter(x => B.has(x)).length;
  const union = new Set([...A, ...B]).size;
  return union ? inter / union : 0;
}

export function groupEntities(items: RawResult[]): Record<string, RawResult[]> {
  const groups: Record<string, RawResult[]> = {};
  for (const it of items) {
    const n = normalizeName(it.venueName ?? it.title);
    let key = n;
    for (const k of Object.keys(groups)) {
      if (tokenSetSim(k, n) >= 0.85) { key = k; break; }
    }
    (groups[key] ||= []).push(it);
  }
  return groups;
}