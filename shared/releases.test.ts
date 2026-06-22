import { describe, expect, it } from "vitest";
import { GITHUB_RELEASES_URL, getSafeReleaseUrl, isNewerReleaseVersion, normalizeReleaseVersion } from "./releases";

describe("release helpers", () => {
  it("normalizes v-prefixed release tags", () => {
    expect(normalizeReleaseVersion("v1.2.3")).toBe("1.2.3");
    expect(normalizeReleaseVersion("V2.0.0")).toBe("2.0.0");
  });

  it("detects newer semver-like release versions", () => {
    expect(isNewerReleaseVersion("v1.1.0", "1.0.9")).toBe(true);
    expect(isNewerReleaseVersion("1.0.0", "1.0.0")).toBe(false);
    expect(isNewerReleaseVersion("1.0.0", "1.0.1")).toBe(false);
    expect(isNewerReleaseVersion("release-latest", "1.0.0")).toBe(false);
  });

  it("allows only TimeBro GitHub release URLs", () => {
    expect(getSafeReleaseUrl("https://github.com/4gray/time-bro/releases/tag/v1.1.0")).toBe(
      "https://github.com/4gray/time-bro/releases/tag/v1.1.0"
    );
    expect(getSafeReleaseUrl("https://github.com/4gray/time-bro/releases-preview")).toBe(GITHUB_RELEASES_URL);
    expect(getSafeReleaseUrl("https://example.com/4gray/time-bro/releases")).toBe(GITHUB_RELEASES_URL);
  });
});
