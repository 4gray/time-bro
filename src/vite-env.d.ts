/// <reference types="vite/client" />

import type {
  AppSettings,
  JiraConnectionResult,
  ReminderSchedulePayload,
  SyncRequest,
  SyncResult
} from "../shared/types";

declare global {
  interface Window {
    jiraWeekTracker?: {
      testJiraConnection: (settings: AppSettings) => Promise<JiraConnectionResult>;
      syncJiraWorklogs: (request: SyncRequest) => Promise<SyncResult>;
      scheduleReminder: (
        payload: ReminderSchedulePayload
      ) => Promise<{ scheduled: boolean; fireAt?: string }>;
    };
  }
}
