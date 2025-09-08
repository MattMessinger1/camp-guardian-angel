import { describe, it, expect } from 'vitest';
import { matchesLocation } from "./geo";
import type { RawResult } from "./types";

describe("matchesLocation", () => {
  it("drops out-of-state hits", () => {
    const r: RawResult = { 
      title: "Blackhawk Ski Club", 
      url: "https://example.com/ny", 
      state: "NY" 
    };
    const m = matchesLocation(r, { city: "Madison", state: "WI" });
    expect(m.pass).toBe(false);
    expect(m.reason).toBe("no_city_or_state_match");
  });

  it("passes when city matches", () => {
    const r: RawResult = { 
      title: "Madison Ski Club", 
      url: "https://example.com", 
      city: "Madison" 
    };
    const m = matchesLocation(r, { city: "Madison", state: "WI" });
    expect(m.pass).toBe(true);
  });

  it("passes when state matches", () => {
    const r: RawResult = { 
      title: "Wisconsin Ski Club", 
      url: "https://example.com", 
      state: "WI" 
    };
    const m = matchesLocation(r, { city: "Madison", state: "WI" });
    expect(m.pass).toBe(true);
  });

  it("applies score adjustments for missing city", () => {
    const r: RawResult = { 
      title: "Some Club", 
      url: "https://example.com", 
      state: "WI" 
    };
    const m = matchesLocation(r, { city: "Madison", state: "WI" });
    expect(m.pass).toBe(true);
    expect(m.scoreAdj).toBe(-0.6); // Missing city penalty
  });

  it("passes all when no bias provided", () => {
    const r: RawResult = { 
      title: "Any Club", 
      url: "https://example.com" 
    };
    const m = matchesLocation(r);
    expect(m.pass).toBe(true);
    expect(m.scoreAdj).toBe(0);
  });
});