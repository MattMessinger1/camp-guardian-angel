import { describe, it, expect } from 'vitest';
import { parseQuery } from "./query";

describe("parseQuery", () => {
  it("extracts Madison, WI", () => {
    const p = parseQuery("blackhawk ski club madison wi");
    expect(p.text).toBe("blackhawk ski club");
    expect(p.location?.city).toBe("Madison");
    expect(p.location?.state).toBe("WI");
  });

  it("handles multiple cities and states", () => {
    const p = parseQuery("swimming lessons chicago il");
    expect(p.text).toBe("swimming lessons");
    expect(p.location?.city).toBe("Chicago");
    expect(p.location?.state).toBe("IL");
  });

  it("handles zip codes", () => {
    const p = parseQuery("dance classes 53703");
    expect(p.text).toBe("dance classes");
    expect(p.location?.zip).toBe("53703");
  });

  it("returns null location when none found", () => {
    const p = parseQuery("guitar lessons online");
    expect(p.text).toBe("guitar lessons online");
    expect(p.location).toBe(null);
  });

  it("handles empty or whitespace query", () => {
    const p = parseQuery("   ");
    expect(p.text).toBe("");
    expect(p.location).toBe(null);
  });
});