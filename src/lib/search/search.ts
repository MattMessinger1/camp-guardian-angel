import { parseQuery } from "./query";
import { collectAll } from "./collect";
import { matchesLocation } from "./geo";
import { groupEntities } from "./entity";
import { score } from "./rank";

export async function unifiedSearch(rawQuery: string, days: number) {
  const parsed = parseQuery(rawQuery);
  const raw = await collectAll(parsed, days);

  const filtered = [];
  for (const r of raw) {
    const m = matchesLocation(r, parsed.location ?? undefined);
    if (m.pass) filtered.push({ ...r, _scoreAdj: m.scoreAdj });
  }

  const groups = groupEntities(filtered);
  const cards = Object.values(groups).map(list => {
    const ranked = list
      .map(x => ({ x, s: score(x) + (x as any)._scoreAdj }))
      .sort((a, b) => b.s - a.s);
    const top = ranked[0].x;
    return {
      title: top.venueName ?? top.title,
      city: top.city ?? null,
      state: top.state ?? null,
      url: top.url,
      count: list.length
    };
  });

  return { parsed, totals: { raw: raw.length, kept: filtered.length, groups: Object.keys(groups).length }, cards };
}