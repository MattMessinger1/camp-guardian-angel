import type { ParsedQuery } from "./query";
import type { RawResult } from "./types";
// Adapters (add thin vendor parsers as you build them)
import { searchWebGeneric } from "./sources/genericWeb";
// Optionally: sawyer/amilia/mindbody adapters later

export async function collectAll(parsed: ParsedQuery, days: number): Promise<RawResult[]> {
  const results = await Promise.all([
    searchWebGeneric(parsed.text, { location: parsed.location, days })
    // add vendor adapters here
  ]);
  return results.flat();
}