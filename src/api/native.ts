import type {
  AppSettings,
  JiraConnectionResult,
  ReminderSchedulePayload,
  SyncRequest,
  SyncResult
} from "../../shared/types";

export const nativeApi = {
  testJiraConnection(settings: AppSettings): Promise<JiraConnectionResult> {
    if (!window.jiraWeekTracker) {
      return Promise.resolve({
        ok: false,
        message: settings.jiraBaseUrl
          ? "Open the Electron app to test Jira credentials."
          : "Add your Jira settings before testing."
      });
    }

    return window.jiraWeekTracker.testJiraConnection(settings);
  },

  syncJiraWorklogs(request: SyncRequest): Promise<SyncResult> {
    if (!window.jiraWeekTracker) {
      return Promise.reject(new Error("Open the Electron app to sync Jira worklogs."));
    }

    return window.jiraWeekTracker.syncJiraWorklogs(request);
  },

  scheduleReminder(payload: ReminderSchedulePayload) {
    if (!window.jiraWeekTracker) {
      return Promise.resolve({ scheduled: false });
    }

    return window.jiraWeekTracker.scheduleReminder(payload);
  }
};
