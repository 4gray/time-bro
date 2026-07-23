// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AppSettings,
  BitbucketReviewSession,
  BitbucketReviewSyncResult
} from "../../shared/types";
import { useBitbucketReviewSync, type BitbucketReviewSyncClient } from "./useBitbucketReviewSync";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const settings: AppSettings = {
  jiraBaseUrl: "https://example.atlassian.net",
  jiraEmail: "person@example.com",
  jiraApiToken: "token",
  bitbucketEmail: "person@example.com",
  bitbucketApiToken: "token",
  bitbucketWorkspace: "yesterlog",
  bitbucketRepositories: "app",
  bitbucketReviewBucketIssueKey: "REV-1",
  weeklyTargetHours: 40,
  workingDays: [1, 2, 3, 4, 5],
  reminderTime: "16:30",
  remindersEnabled: true,
  aiEnabled: false,
  ollamaEndpoint: "http://localhost:11434",
  ollamaModel: "llama3.1:8b",
};

const buildSession = (id: string, overrides: Partial<BitbucketReviewSession> = {}): BitbucketReviewSession => ({
  id,
  workspace: "yesterlog",
  repositorySlug: "app",
  repositoryName: "Yesterlog App",
  pullRequestId: Number(id.replace(/\D/g, "")) || 1,
  pullRequestTitle: `${id} review`,
  pullRequestUrl: `https://bitbucket.example/pull-requests/${id}`,
  pullRequestState: "OPEN",
  jiraIssueKey: "TB-22",
  dateKey: "2026-06-18",
  startedISO: "2026-06-18T10:00:00.000Z",
  endedISO: "2026-06-18T10:30:00.000Z",
  estimatedSeconds: 1800,
  reviewStateLabel: "COMMENTED",
  commentCount: 2,
  activityCount: 3,
  confidence: "high",
  events: [],
  status: "unlogged",
  ...overrides
});

const buildResult = (
  sessions: BitbucketReviewSession[] = [buildSession("s1")],
  overrides: Partial<BitbucketReviewSyncResult> = {}
): BitbucketReviewSyncResult => ({
  weekKey: "2026-06-15",
  weekStartISO: "2026-06-15T00:00:00.000Z",
  weekEndExclusiveISO: "2026-06-22T00:00:00.000Z",
  syncedAt: "2026-06-18T08:00:00.000Z",
  accountId: "account-1",
  workspace: "yesterlog",
  repositoryCount: 1,
  pullRequestCount: sessions.length,
  sessionCount: sessions.length,
  sessions,
  ...overrides
});

type ReviewSyncApi = ReturnType<typeof useBitbucketReviewSync>;

let container: HTMLDivElement;
let root: Root;
let api: ReviewSyncApi | undefined;
let syncBitbucketReviews: ReturnType<typeof vi.fn<BitbucketReviewSyncClient["syncBitbucketReviews"]>>;
let saveBitbucketReviewResult: ReturnType<typeof vi.fn<(result: BitbucketReviewSyncResult) => Promise<void>>>;
let showSuccess: ReturnType<typeof vi.fn<(message: string) => void>>;
let showError: ReturnType<typeof vi.fn<(message: string) => void>>;
let client: BitbucketReviewSyncClient;

function Harness({
  currentSettings = settings,
  demoReviewResult
}: {
  currentSettings?: AppSettings;
  demoReviewResult?: BitbucketReviewSyncResult;
}) {
  api = useBitbucketReviewSync({
    settings: currentSettings,
    weekKey: "2026-06-15",
    weekStartISO: "2026-06-15T00:00:00.000Z",
    weekEndExclusiveISO: "2026-06-22T00:00:00.000Z",
    demoReviewResult,
    client,
    saveBitbucketReviewResult,
    showSuccess,
    showError
  });
  return null;
}

const getApi = () => {
  if (!api) {
    throw new Error("Review sync hook was not rendered.");
  }
  return api;
};

const renderHarness = (props: Parameters<typeof Harness>[0] = {}) => {
  act(() => {
    root.render(<Harness {...props} />);
  });
};

const flushAsync = async () => {
  for (let index = 0; index < 4; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
};

beforeEach(() => {
  api = undefined;
  syncBitbucketReviews = vi.fn();
  saveBitbucketReviewResult = vi.fn(async () => undefined);
  showSuccess = vi.fn();
  showError = vi.fn();
  client = { syncBitbucketReviews };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe("useBitbucketReviewSync", () => {
  it("uses demo review data without calling the native client", async () => {
    const demoResult = buildResult([buildSession("s1"), buildSession("s2")]);
    renderHarness({ demoReviewResult: demoResult });

    await expect(getApi().runReviewSync()).resolves.toBe(demoResult);

    expect(syncBitbucketReviews).not.toHaveBeenCalled();
    expect(saveBitbucketReviewResult).not.toHaveBeenCalled();
    expect(getApi().bitbucketReviewResult).toBe(demoResult);
    expect(showSuccess).toHaveBeenCalledWith("Demo Bitbucket reviews refreshed from seeded fixtures.");
    expect(getApi().isSyncingReviews).toBe(false);
  });

  it("rejects unconfigured Bitbucket settings before syncing", async () => {
    renderHarness({
      currentSettings: {
        ...settings,
        bitbucketApiToken: ""
      }
    });

    await expect(getApi().runReviewSync()).resolves.toBeUndefined();

    expect(syncBitbucketReviews).not.toHaveBeenCalled();
    expect(showError).toHaveBeenCalledWith("Connect Bitbucket in Settings before syncing reviews.");
    expect(getApi().isSyncingReviews).toBe(false);
  });

  it("syncs Bitbucket reviews, preserves logged session state, and persists the merged ledger", async () => {
    const previousResult = buildResult([
      buildSession("s1", {
        status: "logged",
        logged: {
          issueKey: "TB-22",
          worklogId: "wl-1",
          loggedAt: "2026-06-18T10:30:00.000Z",
          targetMode: "reviewed-ticket"
        }
      })
    ]);
    const freshResult = buildResult([buildSession("s1"), buildSession("s2")], { sessionCount: 2, pullRequestCount: 2 });
    syncBitbucketReviews.mockResolvedValue(freshResult);
    renderHarness();

    act(() => {
      getApi().setBitbucketReviewResult(previousResult);
    });

    await act(async () => {
      await expect(getApi().runReviewSync()).resolves.toMatchObject({ sessionCount: 2 });
    });

    expect(syncBitbucketReviews).toHaveBeenCalledWith({
      settings,
      weekKey: "2026-06-15",
      weekStartISO: "2026-06-15T00:00:00.000Z",
      weekEndExclusiveISO: "2026-06-22T00:00:00.000Z"
    });
    expect(saveBitbucketReviewResult).toHaveBeenCalledTimes(1);
    const merged = saveBitbucketReviewResult.mock.calls[0][0];
    expect(merged.sessions.map((session) => session.status)).toEqual(["logged", "unlogged"]);
    expect(merged.sessions[0].logged?.worklogId).toBe("wl-1");
    expect(getApi().bitbucketReviewResult).toBe(merged);
    expect(showSuccess).toHaveBeenCalledWith("Synced 2 Bitbucket review sessions.");
    expect(getApi().isSyncingReviews).toBe(false);
  });

  it("accepts override settings for one sync", async () => {
    const overrideSettings = { ...settings, bitbucketRepositories: "app, docs" };
    const result = buildResult();
    syncBitbucketReviews.mockResolvedValue(result);
    renderHarness();

    await act(async () => {
      await expect(getApi().runReviewSync(overrideSettings)).resolves.toBe(result);
    });

    expect(syncBitbucketReviews).toHaveBeenCalledWith(expect.objectContaining({ settings: overrideSettings }));
  });

  it("exposes a view sync callback that runs review sync with current settings", async () => {
    const result = buildResult([buildSession("s4")]);
    syncBitbucketReviews.mockResolvedValue(result);
    renderHarness();

    act(() => getApi().handleReviewSync());
    await flushAsync();

    expect(syncBitbucketReviews).toHaveBeenCalledWith({
      settings,
      weekKey: "2026-06-15",
      weekStartISO: "2026-06-15T00:00:00.000Z",
      weekEndExclusiveISO: "2026-06-22T00:00:00.000Z"
    });
    expect(saveBitbucketReviewResult).toHaveBeenCalledTimes(1);
    expect(getApi().bitbucketReviewResult).toMatchObject({ sessionCount: 1 });
    expect(getApi().isSyncingReviews).toBe(false);
  });

  it("reports sync failures and resets the syncing flag", async () => {
    syncBitbucketReviews.mockRejectedValue(new Error("Bitbucket unavailable"));
    renderHarness();

    await act(async () => {
      await expect(getApi().runReviewSync()).resolves.toBeUndefined();
    });

    expect(showError).toHaveBeenCalledWith("Bitbucket unavailable");
    expect(saveBitbucketReviewResult).not.toHaveBeenCalled();
    expect(getApi().bitbucketReviewResult).toBeUndefined();
    expect(getApi().isSyncingReviews).toBe(false);
  });
});
