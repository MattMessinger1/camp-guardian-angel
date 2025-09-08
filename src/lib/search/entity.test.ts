import { describe, it, expect } from 'vitest';
import { groupEntities, normalizeName } from "./entity";
import type { RawResult } from "./types";

describe("normalizeName", () => {
  it("removes 'The' prefix", () => {
    expect(normalizeName("The Blackhawk Club")).toBe("blackhawk club");
  });

  it("removes company suffixes", () => {
    expect(normalizeName("Blackhawk Club, Inc.")).toBe("blackhawk club");
    expect(normalizeName("Madison Sports LLC")).toBe("madison sports");
  });

  it("normalizes whitespace and special chars", () => {
    expect(normalizeName("Blackhawk  Ski-Club!!!")).toBe("blackhawk ski club");
  });
});

describe("groupEntities", () => {
  it("dedupes The Blackhawk Ski Club", () => {
    const results: RawResult[] = [
      { title: "Blackhawk Ski Club", url: "https://example.com/a" },
      { title: "The Blackhawk Ski Club, Inc.", url: "https://example.com/b" }
    ];
    const groups = groupEntities(results);
    expect(Object.keys(groups)).toHaveLength(1);
    expect(groups[Object.keys(groups)[0]]).toHaveLength(2);
  });

  it("keeps different entities separate", () => {
    const results: RawResult[] = [
      { title: "Madison Swim Club", url: "https://example.com/a" },
      { title: "Milwaukee Tennis Club", url: "https://example.com/b" }
    ];
    const groups = groupEntities(results);
    expect(Object.keys(groups)).toHaveLength(2);
  });

  it("uses venueName if available", () => {
    const results: RawResult[] = [
      { title: "Swimming Lessons", venueName: "Madison Aquatic Center", url: "https://example.com/a" },
      { title: "Pool Time", venueName: "The Madison Aquatic Center LLC", url: "https://example.com/b" }
    ];
    const groups = groupEntities(results);
    expect(Object.keys(groups)).toHaveLength(1);
  });

  it("handles empty input", () => {
    const groups = groupEntities([]);
    expect(Object.keys(groups)).toHaveLength(0);
  });
});