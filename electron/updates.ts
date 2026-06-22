import {
  GITHUB_LATEST_RELEASE_API_URL,
  GITHUB_RELEASES_URL,
  getSafeReleaseUrl,
  isNewerReleaseVersion,
  normalizeReleaseVersion
} from "../shared/releases";
import type { AppUpdateInfo } from "../shared/types";

interface GitHubReleaseResponse {
  tag_name?: string;
  name?: string | null;
  html_url?: string;
  published_at?: string | null;
}

const parseGitHubError = async (response: Response) => {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message?.trim() || `${response.status} ${response.statusText}`;
  } catch {
    return `${response.status} ${response.statusText}`;
  }
};

const unavailableUpdateInfo = (currentVersion: string, checkedAt: string, error: string): AppUpdateInfo => ({
  currentVersion,
  releasePageUrl: GITHUB_RELEASES_URL,
  checkedAt,
  updateAvailable: false,
  error
});

export const checkForAppUpdate = async (
  currentVersion: string,
  fetchImpl: typeof fetch = fetch
): Promise<AppUpdateInfo> => {
  const checkedAt = new Date().toISOString();

  try {
    const response = await fetchImpl(GITHUB_LATEST_RELEASE_API_URL, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "TimeBro"
      }
    });

    if (response.status === 404) {
      return unavailableUpdateInfo(currentVersion, checkedAt, "No published GitHub releases found.");
    }

    if (!response.ok) {
      const message = await parseGitHubError(response);
      return unavailableUpdateInfo(currentVersion, checkedAt, `GitHub release check failed: ${message}`);
    }

    const release = (await response.json()) as GitHubReleaseResponse;
    const releaseVersion = normalizeReleaseVersion(release.tag_name || release.name || "");

    if (!releaseVersion) {
      return unavailableUpdateInfo(currentVersion, checkedAt, "Latest GitHub release did not include a version tag.");
    }

    return {
      currentVersion,
      latestVersion: releaseVersion,
      releaseName: release.name?.trim() || release.tag_name,
      releasePageUrl: getSafeReleaseUrl(release.html_url),
      publishedAt: release.published_at ?? undefined,
      checkedAt,
      updateAvailable: isNewerReleaseVersion(releaseVersion, currentVersion)
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to check GitHub releases.";
    return unavailableUpdateInfo(currentVersion, checkedAt, message);
  }
};
