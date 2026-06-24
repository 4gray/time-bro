import {
  GITHUB_LATEST_RELEASE_API_URL,
  GITHUB_RELEASES_URL,
  getSafeReleaseAssetUrl,
  getSafeReleaseUrl,
  isNewerReleaseVersion,
  normalizeReleaseVersion
} from "../shared/releases";
import type { AppUpdateInfo } from "../shared/types";

interface GitHubReleaseResponse {
  tag_name?: string;
  name?: string | null;
  html_url?: string;
  body?: string | null;
  published_at?: string | null;
  assets?: GitHubReleaseAssetResponse[];
}

interface GitHubReleaseAssetResponse {
  name?: string;
  browser_download_url?: string;
}

interface ReleaseDownloadAsset {
  name: string;
  url: string;
  platform: NonNullable<AppUpdateInfo["downloadPlatform"]>;
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

const matchesExtension = (assetName: string, extension: string) => assetName.toLowerCase().endsWith(extension);

const findAsset = (
  assets: GitHubReleaseAssetResponse[] | undefined,
  predicate: (assetName: string) => boolean
) => {
  return assets?.find((asset) => {
    const assetName = asset.name?.trim();
    return Boolean(assetName && asset.browser_download_url && predicate(assetName));
  });
};

const selectPlatformDownloadAsset = (
  assets: GitHubReleaseAssetResponse[] | undefined,
  platform: NodeJS.Platform = process.platform
): ReleaseDownloadAsset | undefined => {
  const platformAsset =
    platform === "linux"
      ? {
          platform: "linux" as const,
          asset: findAsset(assets, (assetName) => matchesExtension(assetName, ".deb"))
        }
      : platform === "darwin"
        ? {
            platform: "macos" as const,
            asset:
              findAsset(
                assets,
                (assetName) =>
                  matchesExtension(assetName, ".dmg") && /(arm64|aarch64|apple[-_ ]?silicon|universal)/i.test(assetName)
              )
          }
        : platform === "win32"
          ? {
              platform: "windows" as const,
              asset: findAsset(assets, (assetName) => matchesExtension(assetName, ".exe"))
            }
          : undefined;

  if (!platformAsset?.asset?.name || !platformAsset.asset.browser_download_url) {
    return undefined;
  }

  const safeUrl = getSafeReleaseAssetUrl(platformAsset.asset.browser_download_url);
  if (!safeUrl) {
    return undefined;
  }

  return {
    name: platformAsset.asset.name,
    url: safeUrl,
    platform: platformAsset.platform
  };
};

export const checkForAppUpdate = async (
  currentVersion: string,
  fetchImpl: typeof fetch = fetch,
  platform: NodeJS.Platform = process.platform
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
    const downloadAsset = selectPlatformDownloadAsset(release.assets, platform);

    if (!releaseVersion) {
      return unavailableUpdateInfo(currentVersion, checkedAt, "Latest GitHub release did not include a version tag.");
    }

    return {
      currentVersion,
      latestVersion: releaseVersion,
      releaseName: release.name?.trim() || release.tag_name,
      releaseNotes: release.body?.trim() || undefined,
      releasePageUrl: getSafeReleaseUrl(release.html_url),
      downloadUrl: downloadAsset?.url,
      downloadName: downloadAsset?.name,
      downloadPlatform: downloadAsset?.platform,
      publishedAt: release.published_at ?? undefined,
      checkedAt,
      updateAvailable: isNewerReleaseVersion(releaseVersion, currentVersion)
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to check GitHub releases.";
    return unavailableUpdateInfo(currentVersion, checkedAt, message);
  }
};
