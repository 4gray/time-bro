import { useCallback, useState } from "react";
import type {
  AppSettings,
  BitbucketReviewSyncRequest,
  BitbucketReviewSyncResult
} from "../../shared/types";
import { nativeApi } from "../api/native";
import { isBitbucketConfigured, mergeReviewSessionStates } from "../domain/bitbucketReview";
import { saveBitbucketReviewResult as saveBitbucketReviewResultToStorage } from "../storage/db";

export interface BitbucketReviewSyncClient {
  syncBitbucketReviews(request: BitbucketReviewSyncRequest): Promise<BitbucketReviewSyncResult>;
}

interface UseBitbucketReviewSyncOptions {
  settings: AppSettings;
  weekKey: string;
  weekStartISO: string;
  weekEndExclusiveISO: string;
  demoReviewResult?: BitbucketReviewSyncResult;
  client?: BitbucketReviewSyncClient;
  saveBitbucketReviewResult?: (result: BitbucketReviewSyncResult) => Promise<void>;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

export const useBitbucketReviewSync = ({
  settings,
  weekKey,
  weekStartISO,
  weekEndExclusiveISO,
  demoReviewResult,
  client = nativeApi,
  saveBitbucketReviewResult = saveBitbucketReviewResultToStorage,
  showSuccess,
  showError
}: UseBitbucketReviewSyncOptions) => {
  const [bitbucketReviewResult, setBitbucketReviewResult] = useState<BitbucketReviewSyncResult | undefined>(
    () => demoReviewResult
  );
  const [isSyncingReviews, setIsSyncingReviews] = useState(false);

  const runReviewSync = useCallback(
    async (settingsForSync: AppSettings = settings): Promise<BitbucketReviewSyncResult | undefined> => {
      if (demoReviewResult) {
        setBitbucketReviewResult(demoReviewResult);
        showSuccess("Demo Bitbucket reviews refreshed from seeded fixtures.");
        return demoReviewResult;
      }

      if (!isBitbucketConfigured(settingsForSync)) {
        showError("Connect Bitbucket in Settings before syncing reviews.");
        return undefined;
      }

      setIsSyncingReviews(true);

      try {
        const result = await client.syncBitbucketReviews({
          settings: settingsForSync,
          weekKey,
          weekStartISO,
          weekEndExclusiveISO
        });
        const merged = mergeReviewSessionStates(result, bitbucketReviewResult);
        await saveBitbucketReviewResult(merged);
        setBitbucketReviewResult(merged);
        showSuccess(`Synced ${merged.sessionCount} Bitbucket review sessions.`);
        return merged;
      } catch (error) {
        showError(error instanceof Error ? error.message : "Unable to sync Bitbucket review sessions.");
        return undefined;
      } finally {
        setIsSyncingReviews(false);
      }
    },
    [
      bitbucketReviewResult,
      client,
      demoReviewResult,
      saveBitbucketReviewResult,
      settings,
      showError,
      showSuccess,
      weekEndExclusiveISO,
      weekKey,
      weekStartISO
    ]
  );

  return {
    bitbucketReviewResult,
    setBitbucketReviewResult,
    isSyncingReviews,
    runReviewSync
  };
};
