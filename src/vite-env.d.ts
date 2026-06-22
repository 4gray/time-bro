/// <reference types="vite/client" />

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
} from "../shared/types";

interface TimeBroNativeApi {
  testJiraConnection: (settings: AppSettings) => Promise<JiraConnectionResult>;
  syncJiraWorklogs: (request: SyncRequest) => Promise<SyncResult>;
  fetchAssignedTickets: (request: TicketsRequest) => Promise<TicketsResult>;
  searchJiraTickets: (request: SearchTicketsRequest) => Promise<SearchTicketsResult>;
  addWorklog: (request: AddWorklogRequest) => Promise<AddWorklogResult>;
  updateWorklog: (request: UpdateWorklogRequest) => Promise<UpdateWorklogResult>;
  deleteWorklog: (request: DeleteWorklogRequest) => Promise<DeleteWorklogResult>;
  scheduleReminder: (payload: ReminderSchedulePayload) => Promise<ReminderScheduleResult>;
  getUpdateInfo: () => Promise<AppUpdateInfo>;
  openReleasePage: (url?: string) => Promise<OpenReleasePageResult>;
}

interface ImportMetaEnv {
  readonly VITE_APP_VERSION: string;
}

declare global {
  interface Window {
    timeBro?: TimeBroNativeApi;
    jiraWeekTracker?: TimeBroNativeApi;
  }
}
