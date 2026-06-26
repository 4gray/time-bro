import { describe, expect, it } from "vitest";
import type { AppSettings, JiraTicket, PersonalNote } from "../../shared/types";
import { GITHUB_RELEASES_URL } from "../../shared/releases";
import {
  compareTicketsByCreated,
  createDemoUpdateInfo,
  formatPersonalNoteCount,
  formatReleaseVersion,
  groupPersonalNotesByWeek,
  isJiraConfigured,
  mergeImportedPersonalNotes,
  normalizeJiraSiteInput,
  sortPersonalNotes,
  updateVisiblePersonalNotes
} from "./appHelpers";

const buildSettings = (overrides: Partial<AppSettings> = {}): AppSettings => ({
  jiraBaseUrl: "https://example.atlassian.net",
  jiraEmail: "person@example.com",
  jiraApiToken: "token",
  bitbucketEmail: "",
  bitbucketApiToken: "",
  bitbucketWorkspace: "",
  bitbucketRepositories: "",
  bitbucketReviewBucketIssueKey: "",
  weeklyTargetHours: 40,
  workingDays: [1, 2, 3, 4, 5],
  reminderTime: "16:30",
  remindersEnabled: true,
  aiEnabled: false,
  ollamaEndpoint: "http://localhost:11434",
  ollamaModel: "llama3.1:8b",
  ...overrides
});

const buildTicket = (key: string, createdAt?: string): JiraTicket => ({
  id: key,
  key,
  summary: key,
  projectKey: "TB",
  projectName: "TimeBro",
  statusName: "Open",
  statusCategory: "new",
  loggedSecondsTotal: 0,
  createdAt,
  url: `https://example.atlassian.net/browse/${key}`
});

const buildNote = (id: string, overrides: Partial<PersonalNote> = {}): PersonalNote => {
  const startedISO = overrides.startedISO ?? "2026-06-16T09:00:00.000Z";

  return {
    id,
    weekKey: "2026-06-15",
    dateKey: "2026-06-16",
    text: id,
    timeSpentSeconds: 3600,
    startedISO,
    createdAt: startedISO,
    updatedAt: startedISO,
    ...overrides
  };
};

describe("app helpers", () => {
  it("detects Jira configuration only when all credential fields are present", () => {
    expect(isJiraConfigured(buildSettings())).toBe(true);
    expect(isJiraConfigured(buildSettings({ jiraBaseUrl: " " }))).toBe(false);
    expect(isJiraConfigured(buildSettings({ jiraEmail: "" }))).toBe(false);
    expect(isJiraConfigured(buildSettings({ jiraApiToken: "" }))).toBe(false);
  });

  it("normalizes Jira site input into an origin URL", () => {
    expect(normalizeJiraSiteInput(" timebro ")).toBe("https://timebro.atlassian.net");
    expect(normalizeJiraSiteInput("jira.example.com/project/")).toBe("https://jira.example.com");
    expect(normalizeJiraSiteInput("http://jira.example.com/path")).toBe("http://jira.example.com");
    expect(normalizeJiraSiteInput("   ")).toBe("");
    expect(normalizeJiraSiteInput("not a url")).toBe("not a url");
  });

  it("formats release versions consistently", () => {
    expect(formatReleaseVersion("1.3.2")).toBe("v1.3.2");
    expect(formatReleaseVersion("v1.3.2")).toBe("v1.3.2");
    expect(formatReleaseVersion(" ")).toBe("unknown");
  });

  it("sorts personal notes by start time without mutating the source array", () => {
    const late = buildNote("late", { startedISO: "2026-06-16T13:00:00.000Z" });
    const early = buildNote("early", { startedISO: "2026-06-16T09:00:00.000Z" });
    const notes = [late, early];

    expect(sortPersonalNotes(notes).map((note) => note.id)).toEqual(["early", "late"]);
    expect(notes.map((note) => note.id)).toEqual(["late", "early"]);
  });

  it("sorts tickets by creation date with missing dates last and key fallback", () => {
    const tickets = [
      buildTicket("TB-4"),
      buildTicket("TB-3", "bad-date"),
      buildTicket("TB-2", "2026-06-17T08:00:00.000Z"),
      buildTicket("TB-1", "2026-06-16T08:00:00.000Z")
    ];

    expect([...tickets].sort(compareTicketsByCreated("createdDesc")).map((ticket) => ticket.key)).toEqual([
      "TB-2",
      "TB-1",
      "TB-3",
      "TB-4"
    ]);
    expect([...tickets].sort(compareTicketsByCreated("createdAsc")).map((ticket) => ticket.key)).toEqual([
      "TB-1",
      "TB-2",
      "TB-3",
      "TB-4"
    ]);
  });

  it("updates the visible personal notes list only when the edited note stays in the visible week", () => {
    const oldNote = buildNote("note-1", { startedISO: "2026-06-16T10:00:00.000Z" });
    const neighbor = buildNote("note-2", { startedISO: "2026-06-16T09:00:00.000Z" });
    const editedInWeek = { ...oldNote, text: "Updated", startedISO: "2026-06-16T08:00:00.000Z" };
    const editedOutsideWeek = { ...oldNote, weekKey: "2026-06-22", dateKey: "2026-06-22" };

    expect(updateVisiblePersonalNotes([oldNote, neighbor], oldNote, editedInWeek, "2026-06-15")).toEqual([
      editedInWeek,
      neighbor
    ]);
    expect(updateVisiblePersonalNotes([oldNote, neighbor], oldNote, editedOutsideWeek, "2026-06-15")).toEqual([
      neighbor
    ]);
  });

  it("deduplicates imported personal notes by user-visible content and sorts the merged result", () => {
    const existing = buildNote("existing", {
      title: "Planning",
      text: "Sprint planning",
      startedISO: "2026-06-16T10:00:00.000Z"
    });
    const duplicate = buildNote("duplicate", {
      title: " Planning ",
      text: " Sprint planning ",
      startedISO: "2026-06-16T11:00:00.000Z"
    });
    const addition = buildNote("addition", {
      text: "Review notes",
      startedISO: "2026-06-16T09:00:00.000Z"
    });

    const result = mergeImportedPersonalNotes([existing], [duplicate, addition]);

    expect(result.addedCount).toBe(1);
    expect(result.notes.map((note) => note.id)).toEqual(["addition", "existing"]);
  });

  it("groups personal notes by week key", () => {
    const notes = [
      buildNote("this-week"),
      buildNote("next-week", { weekKey: "2026-06-22", dateKey: "2026-06-22" })
    ];

    const groups = groupPersonalNotesByWeek(notes);

    expect(groups.get("2026-06-15")).toEqual([notes[0]]);
    expect(groups.get("2026-06-22")).toEqual([notes[1]]);
  });

  it("formats personal note import counts", () => {
    expect(formatPersonalNoteCount(1)).toBe("1 personal note");
    expect(formatPersonalNoteCount(2)).toBe("2 personal notes");
  });

  it("builds demo update metadata for current and available releases", () => {
    const current = createDemoUpdateInfo(false);
    const available = createDemoUpdateInfo(true);

    expect(current).toMatchObject({
      currentVersion: "1.0.0",
      latestVersion: "1.0.0",
      releasePageUrl: GITHUB_RELEASES_URL,
      updateAvailable: false
    });
    expect(available).toMatchObject({
      currentVersion: "1.0.0",
      latestVersion: "1.3.0",
      releaseName: "TimeBro v1.3.0",
      downloadPlatform: "macos",
      updateAvailable: true
    });
    expect(new Date(available.checkedAt).toString()).not.toBe("Invalid Date");
  });
});
