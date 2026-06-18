import type { AppSettings, SyncResult, WeekOverride, WeekState, WeekdayNumber } from "../../shared/types";
import {
  addDays,
  formatShortDate,
  formatWeekRange,
  isoWeekday,
  startOfWeekMonday,
  toLocalDateKey,
  WEEKDAY_LABELS
} from "../utils/date";

export const DEFAULT_SETTINGS: AppSettings = {
  jiraBaseUrl: "",
  jiraEmail: "",
  jiraApiToken: "",
  weeklyTargetHours: 40,
  workingDays: [1, 2, 3, 4, 5],
  reminderTime: "16:30",
  remindersEnabled: true
};

export const getWeekBounds = (input: Date) => {
  const weekStart = startOfWeekMonday(input);
  const weekEndExclusive = addDays(weekStart, 7);

  return {
    weekStart,
    weekEndExclusive,
    weekKey: toLocalDateKey(weekStart)
  };
};

export const buildWeekState = (
  weekStart: Date,
  settings: AppSettings,
  override: WeekOverride,
  syncResult?: SyncResult,
  today = new Date()
): WeekState => {
  const weekEndExclusive = addDays(weekStart, 7);
  const weekKey = toLocalDateKey(weekStart);
  const todayKey = toLocalDateKey(today);
  const skippedDates = override.skippedDates;
  const workDates = Array.from({ length: 5 }, (_value, index) => addDays(weekStart, index));
  const activeWorkingDates = workDates
    .filter((date) => {
      const weekday = isoWeekday(date) as WeekdayNumber;
      return settings.workingDays.includes(weekday) && !skippedDates.includes(toLocalDateKey(date));
    })
    .map(toLocalDateKey);
  const dailyTargetHours = activeWorkingDates.length > 0 ? settings.weeklyTargetHours / activeWorkingDates.length : 0;

  const days = workDates.map((date, index) => {
    const dateKey = toLocalDateKey(date);
    const weekday = isoWeekday(date) as WeekdayNumber;
    const isConfiguredWorkingDay = settings.workingDays.includes(weekday);
    const isSkipped = skippedDates.includes(dateKey);
    const targetHours = isConfiguredWorkingDay && !isSkipped ? dailyTargetHours : 0;
    const bucket = syncResult?.daySummaries[dateKey];
    const trackedHours = (bucket?.trackedSeconds ?? 0) / 3600;

    return {
      dateKey,
      dateLabel: formatShortDate(date),
      weekdayName: WEEKDAY_LABELS[index],
      isToday: dateKey === todayKey,
      isConfiguredWorkingDay,
      isSkipped,
      targetHours,
      trackedHours,
      missingHours: Math.max(targetHours - trackedHours, 0),
      issues: bucket?.issues ?? []
    };
  });

  const trackedWeekHours = (syncResult?.trackedSeconds ?? 0) / 3600;

  return {
    weekKey,
    weekStartISO: weekStart.toISOString(),
    weekEndExclusiveISO: weekEndExclusive.toISOString(),
    weekRangeLabel: formatWeekRange(weekStart),
    weeklyTargetHours: settings.weeklyTargetHours,
    trackedWeekHours,
    remainingWeekHours: Math.max(settings.weeklyTargetHours - trackedWeekHours, 0),
    dailyTargetHours,
    activeWorkingDates,
    skippedDates,
    days
  };
};
