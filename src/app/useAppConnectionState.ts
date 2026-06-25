import type { AppSettings } from "../../shared/types";
import { isBitbucketConfigured } from "../domain/bitbucketReview";
import { isJiraConfigured } from "./appHelpers";

export const useAppConnectionState = (settings: AppSettings) => {
  const isConfigured = isJiraConfigured(settings);
  const isBitbucketReady = isBitbucketConfigured(settings);

  return {
    isConfigured,
    isBitbucketReady
  };
};
