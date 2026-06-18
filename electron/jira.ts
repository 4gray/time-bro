import type {
  AppSettings,
  JiraConnectionResult,
  JiraIssueSummary,
  JiraWorklog,
  SyncDayBucket,
  SyncRequest,
  SyncResult
} from "../shared/types";
import { adfToPlainText } from "../shared/adf";

interface JiraUserResponse {
  accountId: string;
  displayName?: string;
}

interface JiraSearchIssue {
  id: string;
  key: string;
  fields?: {
    summary?: string;
  };
}

interface JiraSearchResponse {
  issues?: JiraSearchIssue[];
  nextPageToken?: string;
  isLast?: boolean;
}

interface JiraWorklogResponse {
  startAt: number;
  maxResults: number;
  total: number;
  worklogs?: Array<{
    id: string;
    author?: {
      accountId?: string;
      displayName?: string;
    };
    started: string;
    timeSpentSeconds: number;
    comment?: unknown;
  }>;
}

class JiraApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "JiraApiError";
  }
}

const ensureSettings = (settings: AppSettings) => {
  if (!settings.jiraBaseUrl.trim()) {
    throw new JiraApiError("Add your Jira base URL first.");
  }

  if (!settings.jiraEmail.trim() || !settings.jiraApiToken.trim()) {
    throw new JiraApiError("Add your Jira email and API token first.");
  }
};

const normalizeBaseUrl = (rawUrl: string) => {
  const trimmed = rawUrl.trim().replace(/\/+$/, "");
  const candidate = trimmed.includes("://")
    ? trimmed
    : `https://${trimmed.includes(".") ? trimmed : `${trimmed}.atlassian.net`}`;
  let url: URL;

  try {
    url = new URL(candidate);
  } catch {
    throw new JiraApiError("Jira site must look like company, company.atlassian.net, or https://company.atlassian.net.");
  }

  if (url.protocol !== "https:") {
    throw new JiraApiError("Jira base URL must start with https://.");
  }

  return `${url.protocol}//${url.host}`;
};

const authHeader = (settings: AppSettings) => {
  return `Basic ${Buffer.from(`${settings.jiraEmail}:${settings.jiraApiToken}`).toString("base64")}`;
};

const parseJiraError = async (response: Response) => {
  const fallback = `${response.status} ${response.statusText}`;

  try {
    const body = (await response.json()) as {
      errorMessages?: string[];
      errors?: Record<string, string>;
      message?: string;
    };

    const messages = [
      ...(body.errorMessages ?? []),
      ...Object.values(body.errors ?? {}),
      body.message
    ].filter(Boolean);

    return messages.length ? messages.join(" ") : fallback;
  } catch {
    return fallback;
  }
};

const jiraRequest = async <T>(settings: AppSettings, path: string, init: RequestInit = {}) => {
  ensureSettings(settings);
  const baseUrl = normalizeBaseUrl(settings.jiraBaseUrl);
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: authHeader(settings),
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    const message = await parseJiraError(response);

    if (response.status === 401 || response.status === 403) {
      throw new JiraApiError(`Jira rejected the credentials or permissions: ${message}`, response.status);
    }

    throw new JiraApiError(`Jira request failed: ${message}`, response.status);
  }

  return (await response.json()) as T;
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const mergeIssue = (bucket: SyncDayBucket, issue: JiraIssueSummary) => {
  const existing = bucket.issues.find((candidate) => candidate.key === issue.key);

  if (existing) {
    existing.loggedSeconds += issue.loggedSeconds;

    if (issue.comments?.length) {
      existing.comments = Array.from(new Set([...(existing.comments ?? []), ...issue.comments]));
    }

    return;
  }

  bucket.issues.push(issue);
};

const fetchCurrentUser = (settings: AppSettings) => {
  return jiraRequest<JiraUserResponse>(settings, "/rest/api/3/myself");
};

export const testJiraConnection = async (settings: AppSettings): Promise<JiraConnectionResult> => {
  try {
    const user = await fetchCurrentUser(settings);
    return {
      ok: true,
      message: `Connected as ${user.displayName ?? settings.jiraEmail}.`,
      accountId: user.accountId,
      displayName: user.displayName
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unable to connect to Jira."
    };
  }
};

const searchCandidateIssues = async (settings: AppSettings, weekStart: Date, weekEndExclusive: Date) => {
  const weekEndInclusive = new Date(weekEndExclusive);
  weekEndInclusive.setDate(weekEndInclusive.getDate() - 1);

  const jql = [
    "worklogAuthor = currentUser()",
    `AND worklogDate >= "${toDateKey(weekStart)}"`,
    `AND worklogDate <= "${toDateKey(weekEndInclusive)}"`,
    "ORDER BY updated DESC"
  ].join(" ");

  const issues: JiraSearchIssue[] = [];
  let nextPageToken: string | undefined;
  let guard = 0;

  do {
    const params = new URLSearchParams({
      jql,
      maxResults: "100",
      fields: "summary"
    });

    if (nextPageToken) {
      params.set("nextPageToken", nextPageToken);
    }

    const page = await jiraRequest<JiraSearchResponse>(
      settings,
      `/rest/api/3/search/jql?${params.toString()}`
    );

    issues.push(...(page.issues ?? []));
    nextPageToken = page.nextPageToken;
    guard += 1;

    if (page.isLast !== false) {
      break;
    }
  } while (nextPageToken && guard < 50);

  return issues;
};

const fetchIssueWorklogs = async (
  settings: AppSettings,
  issueKey: string,
  weekStart: Date,
  weekEndExclusive: Date
) => {
  const worklogs: JiraWorklogResponse["worklogs"] = [];
  let startAt = 0;
  let total = 0;

  do {
    const params = new URLSearchParams({
      startAt: String(startAt),
      maxResults: "100",
      startedAfter: String(weekStart.getTime() - 1),
      startedBefore: String(weekEndExclusive.getTime())
    });

    const page = await jiraRequest<JiraWorklogResponse>(
      settings,
      `/rest/api/3/issue/${encodeURIComponent(issueKey)}/worklog?${params.toString()}`
    );

    worklogs.push(...(page.worklogs ?? []));
    total = page.total;
    startAt = page.startAt + page.maxResults;
  } while (startAt < total);

  return worklogs;
};

export const syncJiraWorklogs = async (request: SyncRequest): Promise<SyncResult> => {
  const { settings, weekStartISO, weekEndExclusiveISO, weekKey } = request;
  const weekStart = new Date(weekStartISO);
  const weekEndExclusive = new Date(weekEndExclusiveISO);
  const currentUser = await fetchCurrentUser(settings);
  const candidateIssues = await searchCandidateIssues(settings, weekStart, weekEndExclusive);
  const daySummaries: SyncResult["daySummaries"] = {};
  const collectedWorklogs: JiraWorklog[] = [];

  for (const issue of candidateIssues) {
    const summary = issue.fields?.summary ?? "Untitled Jira issue";
    const worklogs = await fetchIssueWorklogs(settings, issue.key, weekStart, weekEndExclusive);

    for (const worklog of worklogs) {
      const authorAccountId = worklog.author?.accountId;
      const startedDate = new Date(worklog.started);

      if (
        authorAccountId !== currentUser.accountId ||
        Number.isNaN(startedDate.getTime()) ||
        startedDate < weekStart ||
        startedDate >= weekEndExclusive
      ) {
        continue;
      }

      const dateKey = toDateKey(startedDate);
      const comment = adfToPlainText(worklog.comment);
      const normalized: JiraWorklog = {
        id: worklog.id,
        issueId: issue.id,
        issueKey: issue.key,
        issueSummary: summary,
        authorAccountId,
        started: worklog.started,
        timeSpentSeconds: worklog.timeSpentSeconds,
        comment: comment || undefined
      };

      if (!daySummaries[dateKey]) {
        daySummaries[dateKey] = {
          trackedSeconds: 0,
          issues: [],
          worklogs: []
        };
      }

      const bucket = daySummaries[dateKey];
      bucket.trackedSeconds += worklog.timeSpentSeconds;
      bucket.worklogs.push(normalized);
      mergeIssue(bucket, {
        id: issue.id,
        key: issue.key,
        summary,
        url: `${normalizeBaseUrl(settings.jiraBaseUrl)}/browse/${issue.key}`,
        loggedSeconds: worklog.timeSpentSeconds,
        comments: comment ? [comment] : []
      });
      collectedWorklogs.push(normalized);
    }
  }

  const trackedSeconds = collectedWorklogs.reduce((sum, worklog) => sum + worklog.timeSpentSeconds, 0);

  return {
    weekKey,
    weekStartISO,
    weekEndExclusiveISO,
    syncedAt: new Date().toISOString(),
    accountId: currentUser.accountId,
    displayName: currentUser.displayName,
    trackedSeconds,
    issueCount: candidateIssues.length,
    worklogCount: collectedWorklogs.length,
    daySummaries
  };
};
