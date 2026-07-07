import { useCallback } from "react";
import type { AppSettings, SyncResult } from "../../shared/types";
import { isBitbucketConfigured } from "../domain/bitbucketReview";
import { formatSyncTime } from "./appHelpers";

export type AppSyncState = "synced" | "stale" | "syncing";

interface UseSyncControlsOptions {
  settings: AppSettings;
  syncResult?: SyncResult;
  isSyncing: boolean;
  isSyncingJiraActivity: boolean;
  isSyncingReviews: boolean;
  runSync: () => Promise<unknown>;
  runJiraActivitySync: (settings?: AppSettings) => Promise<unknown>;
  runReviewSync: (settings?: AppSettings) => Promise<unknown>;
}

export const useSyncControls = ({
  settings,
  syncResult,
  isSyncing,
  isSyncingJiraActivity,
  isSyncingReviews,
  runSync,
  runJiraActivitySync,
  runReviewSync
}: UseSyncControlsOptions) => {
  const isAnySyncing = isSyncing || isSyncingJiraActivity || isSyncingReviews;
  const syncState: AppSyncState = isAnySyncing ? "syncing" : syncResult ? "synced" : "stale";
  const syncLabel = isAnySyncing ? "SYNCING…" : formatSyncTime(syncResult);

  const handleSync = useCallback(async () => {
    await runSync();
    await runJiraActivitySync(settings);
    if (isBitbucketConfigured(settings)) {
      await runReviewSync(settings);
    }
  }, [runJiraActivitySync, runReviewSync, runSync, settings]);

  return {
    handleSync,
    syncLabel,
    syncState
  };
};
