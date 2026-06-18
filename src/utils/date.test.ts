import { describe, expect, it } from "vitest";
import { formatDuration } from "./date";

describe("formatDuration", () => {
  it("omits minutes when they are zero", () => {
    expect(formatDuration(40)).toBe("40h");
    expect(formatDuration(0)).toBe("0h");
  });

  it("shows minutes when a duration has non-zero minutes", () => {
    expect(formatDuration(31.5)).toBe("31h 30m");
    expect(formatDuration(1.25)).toBe("1h 15m");
  });
});
