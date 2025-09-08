import type { RawResult } from "./types";

export function matchesLocation(
  r: RawResult,
  bias?: { city?: string; state?: string; zip?: string }
): { pass: boolean; scoreAdj: number; reason?: string } {
  if (!bias) return { pass: true, scoreAdj: 0 };
  const hay = `${r.title} ${r.snippet ?? ""} ${r.city ?? ""} ${r.state ?? ""} ${r.url}`.toLowerCase();
  const cityHit = bias.city ? hay.includes(bias.city.toLowerCase()) : false;
  const stateHit = bias.state ? hay.includes(bias.state.toLowerCase()) : false;

  // Keep recall: pass if either city or state matches. If neither—drop.
  if (!(cityHit || stateHit)) return { pass: false, scoreAdj: -1, reason: "no_city_or_state_match" };

  let scoreAdj = 0;
  if (!cityHit && bias.city) scoreAdj -= 0.6;
  if (!stateHit && bias.state) scoreAdj -= 0.3;
  return { pass: true, scoreAdj };
}
