import type {
  AddWorklogRequest,
  AddWorklogResult,
  AppSettings,
  AppUpdateInfo,
  DeleteWorklogRequest,
  DeleteWorklogResult,
  JiraConnectionResult,
  OpenReleasePageResult,
  ReminderSchedulePayload,
  ReminderScheduleResult,
  SearchTicketsRequest,
  SearchTicketsResult,
  SyncRequest,
  SyncResult,
  TicketsRequest,
  TicketsResult,
  UpdateWorklogRequest,
  UpdateWorklogResult
} from "../../shared/types";
import { GITHUB_RELEASES_URL, getSafeReleaseUrl } from "../../shared/releases";

const getNativeBridge = () => window.timeBro ?? window.jiraWeekTracker;
const rendererPreviewVersion = import.meta.env.VITE_APP_VERSION || "unknown";

export const nativeApi = {
  testJiraConnection(settings: AppSettings): Promise<JiraConnectionResult> {
    const bridge = getNativeBridge();

    if (!bridge) {
      return Promise.resolve({
        ok: false,
        message: settings.jiraBaseUrl
          ? "Open the Electron app to test Jira credentials."
          : "Add your Jira settings before testing."
      });
    }

    return bridge.testJiraConnection(settings);
  },

  syncJiraWorklogs(request: SyncRequest): Promise<SyncResult> {
    const bridge = getNativeBridge();

    if (!bridge) {
      return Promise.reject(new Error("Open the Electron app to sync Jira worklogs."));
    }

    return bridge.syncJiraWorklogs(request);
  },

  fetchAssignedTickets(request: TicketsRequest): Promise<TicketsResult> {
    const bridge = getNativeBridge();

    if (!bridge) {
      return Promise.resolve({
        fetchedAt: new Date().toISOString(),
        accountId: "",
        inProgress: [],
        recentlyClosed: []
      });
    }

    return bridge.fetchAssignedTickets(request);
  },

  searchJiraTickets(request: SearchTicketsRequest): Promise<SearchTicketsResult> {
    const bridge = getNativeBridge();

    if (!bridge) {
      return Promise.resolve({
        query: request.query.trim(),
        issues: []
      });
    }

    return bridge.searchJiraTickets(request);
  },

  addWorklog(request: AddWorklogRequest): Promise<AddWorklogResult> {
    const bridge = getNativeBridge();

    if (!bridge) {
      return Promise.reject(new Error("Open the Electron app to log time to Jira."));
    }

    return bridge.addWorklog(request);
  },

  updateWorklog(request: UpdateWorklogRequest): Promise<UpdateWorklogResult> {
    const bridge = getNativeBridge();

    if (!bridge) {
      return Promise.reject(new Error("Open the Electron app to edit Jira worklogs."));
    }

    return bridge.updateWorklog(request);
  },

  deleteWorklog(request: DeleteWorklogRequest): Promise<DeleteWorklogResult> {
    const bridge = getNativeBridge();

    if (!bridge) {
      return Promise.reject(new Error("Open the Electron app to delete Jira worklogs."));
    }

    return bridge.deleteWorklog(request);
  },

  scheduleReminder(payload: ReminderSchedulePayload): Promise<ReminderScheduleResult> {
    const bridge = getNativeBridge();

    if (!bridge) {
      return Promise.resolve({
        scheduled: false,
        reason: "unsupported"
      });
    }

    return bridge.scheduleReminder(payload);
  },

  getUpdateInfo(): Promise<AppUpdateInfo> {
    const bridge = getNativeBridge();

    if (!bridge) {
      return Promise.resolve({
        currentVersion: rendererPreviewVersion,
        releasePageUrl: GITHUB_RELEASES_URL,
        checkedAt: new Date().toISOString(),
        updateAvailable: false,
        error: "Open the Electron app to check GitHub Releases."
      });
    }

    return bridge.getUpdateInfo();
  },

  openReleasePage(url?: string): Promise<OpenReleasePageResult> {
    const bridge = getNativeBridge();
    const releaseUrl = getSafeReleaseUrl(url);

    if (!bridge) {
      window.open(releaseUrl, "_blank", "noopener,noreferrer");
      return Promise.resolve({
        ok: true,
        url: releaseUrl
      });
    }

    return bridge.openReleasePage(releaseUrl);
  }
};
