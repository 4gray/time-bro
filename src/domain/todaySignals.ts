import type { BitbucketReviewSyncResult, JiraActivitySyncResult } from "../../shared/types";
import {
  buildCommitSignals,
  buildJiraActivitySignals,
  buildSignals,
  toReconstructCommitGroups,
  toReconstructJiraActivities,
  toReconstructReviewSessions,
  type ReconstructSignal
} from "./reconstruct";

/**
 * Detected-activity signals for a single day, reusing the Reconstruct engine's mappers
 * and builders so the Today ghost layer and the Reconstruct view derive signals
 * identically. Only the timed sources a ghost needs are mapped (Bitbucket reviews +
 * commits, Jira activity); the recurring/local-entry/placement machinery of
 * `buildReconstructDay` is deliberately skipped.
 *
 * The result is the raw signal set — filter to placeable ghosts (`!isMarker &&
 * durationMinutes > 0`) and to keys not already logged at the call site.
 */
export const buildDaySignals = (
  dateKey: string,
  review: BitbucketReviewSyncResult | undefined,
  activity: JiraActivitySyncResult | undefined
): ReconstructSignal[] => [
  ...buildSignals(toReconstructReviewSessions(review?.sessions, dateKey)),
  ...buildCommitSignals(toReconstructCommitGroups(review?.commitGroups, dateKey)),
  ...buildJiraActivitySignals(toReconstructJiraActivities(activity?.activities, dateKey))
];
