import { describe, expect, it } from "vitest";
import { GITHUB_RELEASES_URL } from "../shared/releases";
import { checkForAppUpdate } from "./updates";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });

describe("checkForAppUpdate", () => {
  it("marks a newer GitHub release as available", async () => {
    const result = await checkForAppUpdate("1.0.0", async () =>
      jsonResponse({
        tag_name: "v1.1.0",
        name: "TimeBro v1.1.0",
        html_url: "https://github.com/4gray/time-bro/releases/tag/v1.1.0",
        published_at: "2026-06-22T12:00:00Z"
      })
    );

    expect(result.currentVersion).toBe("1.0.0");
    expect(result.latestVersion).toBe("1.1.0");
    expect(result.releaseName).toBe("TimeBro v1.1.0");
    expect(result.releasePageUrl).toBe("https://github.com/4gray/time-bro/releases/tag/v1.1.0");
    expect(result.updateAvailable).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("returns an unavailable result for GitHub errors", async () => {
    const result = await checkForAppUpdate("1.0.0", async () =>
      jsonResponse(
        {
          message: "rate limit"
        },
        403
      )
    );

    expect(result.currentVersion).toBe("1.0.0");
    expect(result.releasePageUrl).toBe(GITHUB_RELEASES_URL);
    expect(result.updateAvailable).toBe(false);
    expect(result.error).toContain("rate limit");
  });
});
