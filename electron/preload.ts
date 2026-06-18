import { contextBridge, ipcRenderer } from "electron";
import type {
  AppSettings,
  JiraConnectionResult,
  ReminderSchedulePayload,
  SyncRequest,
  SyncResult
} from "../shared/types";

contextBridge.exposeInMainWorld("jiraWeekTracker", {
  testJiraConnection: (settings: AppSettings): Promise<JiraConnectionResult> => {
    return ipcRenderer.invoke("jira:test-connection", settings);
  },
  syncJiraWorklogs: (request: SyncRequest): Promise<SyncResult> => {
    return ipcRenderer.invoke("jira:sync-worklogs", request);
  },
  scheduleReminder: (payload: ReminderSchedulePayload): Promise<{ scheduled: boolean; fireAt?: string }> => {
    return ipcRenderer.invoke("reminder:schedule", payload);
  }
});
