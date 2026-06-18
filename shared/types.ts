export type WeekdayNumber = 1 | 2 | 3 | 4 | 5;

export interface AppSettings {
  jiraBaseUrl: string;
  jiraEmail: string;
  jiraApiToken: string;
  weeklyTargetHours: number;
  workingDays: WeekdayNumber[];
  reminderTime: string;
  remindersEnabled: boolean;
}

export interface WeekOverride {
  weekKey: string;
  skippedDates: string[];
}

export interface JiraIssueSummary {
  id: string;
  key: string;
  summary: string;
  url?: string;
  loggedSeconds: number;
  comments?: string[];
}

export interface JiraWorklog {
  id: string;
  issueId: string;
  issueKey: string;
  issueSummary: string;
  authorAccountId: string;
  started: string;
  timeSpentSeconds: number;
  comment?: string;
}

export interface SyncDayBucket {
  trackedSeconds: number;
  issues: JiraIssueSummary[];
  worklogs: JiraWorklog[];
}

export interface SyncResult {
  weekKey: string;
  weekStartISO: string;
  weekEndExclusiveISO: string;
  syncedAt: string;
  accountId: string;
  displayName?: string;
  trackedSeconds: number;
  issueCount: number;
  worklogCount: number;
  daySummaries: Record<string, SyncDayBucket>;
}

export interface DayTrackingSummary {
  dateKey: string;
  dateLabel: string;
  weekdayName: string;
  isToday: boolean;
  isConfiguredWorkingDay: boolean;
  isSkipped: boolean;
  targetHours: number;
  trackedHours: number;
  missingHours: number;
  issues: JiraIssueSummary[];
}

export interface WeekState {
  weekKey: string;
  weekStartISO: string;
  weekEndExclusiveISO: string;
  weekRangeLabel: string;
  weeklyTargetHours: number;
  trackedWeekHours: number;
  remainingWeekHours: number;
  dailyTargetHours: number;
  activeWorkingDates: string[];
  skippedDates: string[];
  days: DayTrackingSummary[];
}

export interface JiraConnectionResult {
  ok: boolean;
  message: string;
  accountId?: string;
  displayName?: string;
}

export interface SyncRequest {
  settings: AppSettings;
  weekStartISO: string;
  weekEndExclusiveISO: string;
  weekKey: string;
}

export interface ReminderSchedulePayload {
  settings: AppSettings;
  weekKey: string;
  skippedDates: string[];
  remainingWeekHours: number;
  todayDateKey: string;
}
