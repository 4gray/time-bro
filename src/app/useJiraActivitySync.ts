import { useCallback, useState } from "react";
import type { AppSettings, JiraActivitySyncResult, SyncRequest } from "../../shared/types";
import { nativeApi } from "../api/native";
import { isJiraConfigured } from "./appHelpers";
import { saveJiraActivityResult as saveJiraActivityResultToStorage } from "../storage/db";

export interface JiraActivitySyncClient {
  syncJiraActivity(request: SyncRequest): Promise<JiraActivitySyncResult>;
}

interface UseJiraActivitySyncOptions {
  settings: AppSettings;
  weekKey: string;
  weekStartISO: string;
  weekEndExclusiveISO: string;
  demoJiraActivityResult?: JiraActivitySyncResult;
  client?: JiraActivitySyncClient;
  saveJiraActivityResult?: (result: JiraActivitySyncResult) => Promise<void>;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

export const useJiraActivitySync = ({
  settings,
  weekKey,
  weekStartISO,
  weekEndExclusiveISO,
  demoJiraActivityResult,
  client = nativeApi,
  saveJiraActivityResult = saveJiraActivityResultToStorage,
  showSuccess,
  showError
}: UseJiraActivitySyncOptions) => {
  const [jiraActivityResult, setJiraActivityResult] = useState<JiraActivitySyncResult | undefined>(
    () => demoJiraActivityResult
  );
  const [isSyncingJiraActivity, setIsSyncingJiraActivity] = useState(false);

  const runJiraActivitySync = useCallback(
    async (settingsForSync: AppSettings = settings): Promise<JiraActivitySyncResult | undefined> => {
      if (demoJiraActivityResult) {
        setJiraActivityResult(demoJiraActivityResult);
        showSuccess("Demo Jira activity refreshed from seeded fixtures.");
        return demoJiraActivityResult;
      }

      if (!isJiraConfigured(settingsForSync)) {
        showError("Connect Jira in Settings before syncing activity.");
        return undefined;
      }

      setIsSyncingJiraActivity(true);

      try {
        const result = await client.syncJiraActivity({
          settings: settingsForSync,
          weekKey,
          weekStartISO,
          weekEndExclusiveISO
        });
        await saveJiraActivityResult(result);
        setJiraActivityResult(result);
        const partialLabel = result.isPartial ? " Partial scan; the busiest issues were bounded to keep sync fast." : "";
        showSuccess(`Synced ${result.activityCount} Jira activity signals.${partialLabel}`);
        return result;
      } catch (error) {
        showError(error instanceof Error ? error.message : "Unable to sync Jira activity.");
        return undefined;
      } finally {
        setIsSyncingJiraActivity(false);
      }
    },
    [
      client,
      demoJiraActivityResult,
      saveJiraActivityResult,
      settings,
      showError,
      showSuccess,
      weekEndExclusiveISO,
      weekKey,
      weekStartISO
    ]
  );

  return {
    jiraActivityResult,
    setJiraActivityResult,
    isSyncingJiraActivity,
    runJiraActivitySync
  };
};
