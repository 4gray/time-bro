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
    const result = await checkForAppUpdate(
      "1.0.0",
      async () =>
        jsonResponse({
          tag_name: "v1.1.0",
          name: "TimeBro v1.1.0",
          html_url: "https://github.com/4gray/time-bro/releases/tag/v1.1.0",
          body: "## Changed\n\n- Added direct downloads.",
          published_at: "2026-06-22T12:00:00Z",
          assets: [
            {
              name: "TimeBro-1.1.0-arm64.dmg",
              browser_download_url: "https://github.com/4gray/time-bro/releases/download/v1.1.0/TimeBro-1.1.0-arm64.dmg"
            },
            {
              name: "TimeBro-1.1.0.deb",
              browser_download_url: "https://github.com/4gray/time-bro/releases/download/v1.1.0/TimeBro-1.1.0.deb"
            }
          ]
        }),
      "darwin"
    );

    expect(result.currentVersion).toBe("1.0.0");
    expect(result.latestVersion).toBe("1.1.0");
    expect(result.releaseName).toBe("TimeBro v1.1.0");
    expect(result.releaseNotes).toContain("Added direct downloads.");
    expect(result.releasePageUrl).toBe("https://github.com/4gray/time-bro/releases/tag/v1.1.0");
    expect(result.downloadName).toBe("TimeBro-1.1.0-arm64.dmg");
    expect(result.downloadUrl).toBe(
      "https://github.com/4gray/time-bro/releases/download/v1.1.0/TimeBro-1.1.0-arm64.dmg"
    );
    expect(result.downloadPlatform).toBe("macos");
    expect(result.updateAvailable).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("selects a deb asset on Linux", async () => {
    const result = await checkForAppUpdate(
      "1.0.0",
      async () =>
        jsonResponse({
          tag_name: "v1.1.0",
          html_url: "https://github.com/4gray/time-bro/releases/tag/v1.1.0",
          assets: [
            {
              name: "TimeBro-1.1.0.exe",
              browser_download_url: "https://github.com/4gray/time-bro/releases/download/v1.1.0/TimeBro-1.1.0.exe"
            },
            {
              name: "TimeBro-1.1.0.deb",
              browser_download_url: "https://github.com/4gray/time-bro/releases/download/v1.1.0/TimeBro-1.1.0.deb"
            }
          ]
        }),
      "linux"
    );

    expect(result.downloadName).toBe("TimeBro-1.1.0.deb");
    expect(result.downloadPlatform).toBe("linux");
  });

  it("selects an exe asset on Windows", async () => {
    const result = await checkForAppUpdate(
      "1.0.0",
      async () =>
        jsonResponse({
          tag_name: "v1.1.0",
          html_url: "https://github.com/4gray/time-bro/releases/tag/v1.1.0",
          assets: [
            {
              name: "TimeBro-1.1.0-arm64.dmg",
              browser_download_url: "https://github.com/4gray/time-bro/releases/download/v1.1.0/TimeBro-1.1.0-arm64.dmg"
            },
            {
              name: "TimeBro-1.1.0.exe",
              browser_download_url: "https://github.com/4gray/time-bro/releases/download/v1.1.0/TimeBro-1.1.0.exe"
            }
          ]
        }),
      "win32"
    );

    expect(result.downloadName).toBe("TimeBro-1.1.0.exe");
    expect(result.downloadPlatform).toBe("windows");
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
