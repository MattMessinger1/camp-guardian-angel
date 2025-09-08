import type { RawResult } from "./types";

export function score(r: RawResult, now = Date.now()): number {
  let s = 1;
  if (r.provider) s += 0.2; // structured vendor adapters beat generic
  if (r.startDate) {
    const d = new Date(r.startDate).getTime();
    const days = (d - now) / 86400000;
    if (days < 0) s -= 0.5;       // past → down-rank
    else if (days <= 60) s += 0.2; // inside window → up-rank
  }
  if (/registration|sign[- ]?up|enroll/i.test(`${r.title} ${r.snippet ?? ""}`)) s += 0.1;
  return s;
}