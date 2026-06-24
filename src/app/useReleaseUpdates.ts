import { useCallback, useEffect, useRef, useState } from "react";
import type { AppUpdateInfo, OpenReleasePageResult } from "../../shared/types";
import { GITHUB_RELEASES_URL } from "../../shared/releases";
import { nativeApi } from "../api/native";
import { isRecentUpdateInfo, readCachedUpdateInfo, writeCachedUpdateInfo } from "../domain/updateCache";
import { createDemoUpdateInfo, formatReleaseVersion } from "./appHelpers";
import type { SnackbarOptions } from "./useSnackbars";

export interface ReleaseUpdateClient {
  getUpdateInfo(): Promise<AppUpdateInfo>;
  openReleasePage(url?: string): Promise<OpenReleasePageResult>;
}

export interface CheckForUpdatesOptions {
  force?: boolean;
  notifyWhenCurrent?: boolean;
}

interface UseReleaseUpdatesOptions {
  appVersion: string;
  isDemo?: boolean;
  demoUpdateAvailable?: boolean;
  autoCheck?: boolean;
  client?: ReleaseUpdateClient;
  showSnackbar: (kind: "info", message: string, options?: SnackbarOptions) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

export const useReleaseUpdates = ({
  appVersion,
  isDemo = false,
  demoUpdateAvailable = false,
  autoCheck = true,
  client = nativeApi,
  showSnackbar,
  showSuccess,
  showError
}: UseReleaseUpdatesOptions) => {
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | undefined>(() =>
    isDemo ? createDemoUpdateInfo(demoUpdateAvailable) : undefined
  );
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [releaseNotesDialogInfo, setReleaseNotesDialogInfo] = useState<AppUpdateInfo | undefined>();
  const updateInfoRef = useRef(updateInfo);
  const updateSnackbarShownForRef = useRef<string | undefined>();

  const storeUpdateInfo = useCallback((next: AppUpdateInfo | undefined) => {
    updateInfoRef.current = next;
    setUpdateInfo(next);
  }, []);

  const updateStoredInfo = useCallback((updater: (current?: AppUpdateInfo) => AppUpdateInfo | undefined) => {
    const next = updater(updateInfoRef.current);
    updateInfoRef.current = next;
    setUpdateInfo(next);
  }, []);

  const openReleasePage = useCallback(
    (url?: string) => {
      void client.openReleasePage(url ?? GITHUB_RELEASES_URL).catch((error) => {
        showError(error instanceof Error ? error.message : "Unable to open GitHub Releases.");
      });
    },
    [client, showError]
  );

  const openReleaseNotes = useCallback(
    (info?: AppUpdateInfo) => {
      const releaseInfo = info ?? updateInfoRef.current;
      if (!releaseInfo?.latestVersion) {
        showError("No GitHub release notes are available yet.");
        return;
      }

      setReleaseNotesDialogInfo(releaseInfo);
    },
    [showError]
  );

  const closeReleaseNotes = useCallback(() => {
    setReleaseNotesDialogInfo(undefined);
  }, []);

  const openUpdateDownload = useCallback(
    (info?: AppUpdateInfo) => {
      const downloadUrl = info?.downloadUrl ?? updateInfoRef.current?.downloadUrl;
      if (!downloadUrl) {
        showError("No installer download is available for this platform.");
        return;
      }

      void client.openReleasePage(downloadUrl).catch((error) => {
        showError(error instanceof Error ? error.message : "Unable to open the release download.");
      });
    },
    [client, showError]
  );

  const showUpdateAvailable = useCallback(
    (info: AppUpdateInfo) => {
      if (!info.updateAvailable || !info.latestVersion) {
        return;
      }

      if (updateSnackbarShownForRef.current === info.latestVersion) {
        return;
      }

      updateSnackbarShownForRef.current = info.latestVersion;
      showSnackbar(
        "info",
        `TimeBro ${formatReleaseVersion(info.latestVersion)} is available. Current version: ${formatReleaseVersion(
          info.currentVersion
        )}.`,
        {
          actions: [
            {
              label: "Release notes",
              icon: "notes",
              onAction: () => openReleaseNotes(info)
            },
            ...(info.downloadUrl
              ? [
                  {
                    label: "Download",
                    icon: "download" as const,
                    onAction: () => openUpdateDownload(info)
                  }
                ]
              : [
                  {
                    label: "GitHub",
                    icon: "external" as const,
                    onAction: () => openReleasePage(info.releasePageUrl)
                  }
                ])
          ],
          autoDismiss: false
        }
      );
    },
    [openReleaseNotes, openReleasePage, openUpdateDownload, showSnackbar]
  );

  const checkForUpdates = useCallback(
    async (options: CheckForUpdatesOptions = {}) => {
      if (isDemo) {
        const demoUpdateInfo = createDemoUpdateInfo(demoUpdateAvailable);
        storeUpdateInfo(demoUpdateInfo);

        if (demoUpdateInfo.updateAvailable) {
          showUpdateAvailable(demoUpdateInfo);
        } else if (options.notifyWhenCurrent) {
          showSuccess("TimeBro is up to date.");
        }

        return demoUpdateInfo;
      }

      if (!options.force) {
        const cachedUpdateInfo = readCachedUpdateInfo(appVersion);
        if (cachedUpdateInfo && isRecentUpdateInfo(cachedUpdateInfo)) {
          storeUpdateInfo(cachedUpdateInfo);
          if (cachedUpdateInfo.updateAvailable) {
            showUpdateAvailable(cachedUpdateInfo);
          }
          return cachedUpdateInfo;
        }
      }

      setIsCheckingUpdates(true);

      try {
        const result = await client.getUpdateInfo();
        storeUpdateInfo(result);
        writeCachedUpdateInfo(result);

        if (result.updateAvailable) {
          showUpdateAvailable(result);
        } else if (options.notifyWhenCurrent) {
          if (result.error) {
            showError(result.error);
          } else {
            showSuccess("TimeBro is up to date.");
          }
        }

        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to check GitHub Releases.";
        updateStoredInfo((current) => ({
          currentVersion: current?.currentVersion ?? "unknown",
          releasePageUrl: current?.releasePageUrl ?? GITHUB_RELEASES_URL,
          checkedAt: new Date().toISOString(),
          updateAvailable: false,
          error: message
        }));

        if (options.notifyWhenCurrent) {
          showError(message);
        }

        return undefined;
      } finally {
        setIsCheckingUpdates(false);
      }
    },
    [
      appVersion,
      client,
      demoUpdateAvailable,
      isDemo,
      showError,
      showSuccess,
      showUpdateAvailable,
      storeUpdateInfo,
      updateStoredInfo
    ]
  );

  useEffect(() => {
    if (!autoCheck || isDemo) {
      return;
    }

    void checkForUpdates();
  }, [autoCheck, checkForUpdates, isDemo]);

  return {
    updateInfo,
    isCheckingUpdates,
    releaseNotesDialogInfo,
    checkForUpdates,
    openReleasePage,
    openReleaseNotes,
    closeReleaseNotes,
    openUpdateDownload
  };
};
