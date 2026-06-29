import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppSettings } from "../shared/types";
import { fetchJiraIssueDetails, searchJiraTickets } from "./jira";

const settings: AppSettings = {
  jiraBaseUrl: "https://example.atlassian.net",
  jiraEmail: "person@example.test",
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
};

const jiraSearchResponse = (issues: unknown[] = []) =>
  new Response(
    JSON.stringify({
      issues,
      isLast: true
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    }
  });

describe("searchJiraTickets", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("adds the assigned-to-me filter to Jira search JQL when requested", async () => {
    const fetchMock = vi.fn(async () => jiraSearchResponse());
    vi.stubGlobal("fetch", fetchMock);

    await searchJiraTickets({
      settings,
      query: "metadata",
      assignedOnly: true,
      sortMode: "createdAsc",
      limit: 40
    });

    const requestedUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(requestedUrl.pathname).toBe("/rest/api/3/search/jql");
    expect(requestedUrl.searchParams.get("maxResults")).toBe("40");
    expect(requestedUrl.searchParams.get("jql")).toBe(
      'assignee = currentUser() AND (text ~ "metadata") ORDER BY created ASC'
    );
  });

  it("leaves Jira search unassigned-scoped by default", async () => {
    const fetchMock = vi.fn(async () => jiraSearchResponse());
    vi.stubGlobal("fetch", fetchMock);

    await searchJiraTickets({
      settings,
      query: "metadata",
      sortMode: "createdDesc"
    });

    const requestedUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(requestedUrl.searchParams.get("jql")).toBe('(text ~ "metadata") ORDER BY created DESC');
  });

  it("can browse assigned Jira tickets without a text query", async () => {
    const fetchMock = vi.fn(async () => jiraSearchResponse());
    vi.stubGlobal("fetch", fetchMock);

    await searchJiraTickets({
      settings,
      query: "",
      assignedOnly: true,
      allowEmptyQuery: true,
      sortMode: "createdDesc",
      limit: 20
    });

    const requestedUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(requestedUrl.searchParams.get("jql")).toBe("assignee = currentUser() ORDER BY created DESC");
  });

  it("can browse accessible Jira tickets without the assigned filter", async () => {
    const fetchMock = vi.fn(async () => jiraSearchResponse());
    vi.stubGlobal("fetch", fetchMock);

    await searchJiraTickets({
      settings,
      query: "",
      allowEmptyQuery: true,
      sortMode: "createdAsc"
    });

    const requestedUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(requestedUrl.searchParams.get("jql")).toBe("created <= now() ORDER BY created ASC");
  });

  it("requests and normalizes Jira issue status and assignee fields", async () => {
    const fetchMock = vi.fn(async () =>
      jiraSearchResponse([
        {
          id: "10001",
          key: "OPS-77",
          fields: {
            summary: "Pair on incident review notes",
            project: { key: "OPS", name: "Operations" },
            status: {
              name: "Refused",
              statusCategory: { key: "completed" }
            },
            assignee: { displayName: "Sam Rivera" }
          }
        }
      ])
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await searchJiraTickets({
      settings,
      query: "incident",
      sortMode: "createdDesc"
    });

    const requestedUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(requestedUrl.searchParams.get("fields")?.split(",")).toContain("status");
    expect(requestedUrl.searchParams.get("fields")?.split(",")).toContain("assignee");
    expect(result.issues[0]).toMatchObject({
      key: "OPS-77",
      statusName: "Refused",
      statusCategory: "done",
      assigneeDisplayName: "Sam Rivera"
    });
  });
});

describe("fetchJiraIssueDetails", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests Jira issue basics and sums only the current user's worklogs", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const requestedUrl = new URL(String(url));

      if (requestedUrl.pathname === "/rest/api/3/myself") {
        return jsonResponse({ accountId: "me", displayName: "Me" });
      }

      if (requestedUrl.pathname === "/rest/api/3/issue/OPS-77") {
        return jsonResponse({
          id: "10001",
          key: "OPS-77",
          fields: {
            summary: "Pair on incident review notes",
            description: {
              type: "doc",
              version: 1,
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Write the incident follow-up." }]
                }
              ]
            },
            aggregatetimespent: 12_600,
            project: { key: "OPS", name: "Operations" },
            status: {
              name: "In Progress",
              statusCategory: { key: "indeterminate" }
            },
            assignee: { displayName: "Sam Rivera" },
            issuetype: { name: "Task", hierarchyLevel: 0 }
          }
        });
      }

      if (requestedUrl.pathname === "/rest/api/3/issue/OPS-77/worklog") {
        return jsonResponse({
          startAt: 0,
          maxResults: 100,
          total: 3,
          worklogs: [
            { id: "1", author: { accountId: "me" }, started: "2026-06-22T09:00:00.000+0000", timeSpentSeconds: 3600 },
            { id: "2", author: { accountId: "other" }, started: "2026-06-22T10:00:00.000+0000", timeSpentSeconds: 7200 },
            { id: "3", author: { accountId: "me" }, started: "2026-06-23T09:00:00.000+0000", timeSpentSeconds: 1800 }
          ]
        });
      }

      throw new Error(`Unexpected Jira request: ${requestedUrl.pathname}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchJiraIssueDetails({ settings, issueKey: "ops-77" });
    const issueRequest = fetchMock.mock.calls
      .map((call) => new URL(String(call[0])))
      .find((url) => url.pathname === "/rest/api/3/issue/OPS-77");

    expect(issueRequest?.searchParams.get("fields")?.split(",")).toContain("description");
    expect(result).toMatchObject({
      key: "OPS-77",
      summary: "Pair on incident review notes",
      description: "Write the incident follow-up.",
      descriptionAdf: {
        type: "doc",
        version: 1
      },
      statusName: "In Progress",
      statusCategory: "indeterminate",
      assigneeDisplayName: "Sam Rivera",
      loggedSecondsTotal: 12_600,
      myLoggedSecondsTotal: 5400,
      myWorklogCount: 2
    });
  });
});
