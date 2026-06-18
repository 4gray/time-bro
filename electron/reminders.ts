import { Notification } from "electron";
import type { ReminderSchedulePayload, WeekdayNumber } from "../shared/types";

let reminderTimer: NodeJS.Timeout | undefined;

const minutesFromTime = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return (Number.isFinite(hours) ? hours : 16) * 60 + (Number.isFinite(minutes) ? minutes : 30);
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isoWeekday = (date: Date): WeekdayNumber | 6 | 7 => {
  const day = date.getDay();
  return (day === 0 ? 7 : day) as WeekdayNumber | 6 | 7;
};

const formatMissing = (hours: number) => {
  const totalMinutes = Math.max(Math.round(hours * 60), 0);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${wholeHours}h` : `${wholeHours}h ${String(minutes).padStart(2, "0")}m`;
};

const nextReminderDate = (payload: ReminderSchedulePayload) => {
  const now = new Date();
  const reminderMinutes = minutesFromTime(payload.settings.reminderTime);

  for (let offset = 0; offset < 8; offset += 1) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + offset);
    candidate.setHours(Math.floor(reminderMinutes / 60), reminderMinutes % 60, 0, 0);

    const weekday = isoWeekday(candidate);
    const dateKey = toDateKey(candidate);
    const isWorking = weekday <= 5 && payload.settings.workingDays.includes(weekday as WeekdayNumber);
    const isSkipped = payload.skippedDates.includes(dateKey);

    if (isWorking && !isSkipped && candidate > now) {
      return candidate;
    }
  }

  return null;
};

export const scheduleReminder = (payload: ReminderSchedulePayload) => {
  if (reminderTimer) {
    clearTimeout(reminderTimer);
    reminderTimer = undefined;
  }

  if (!payload.settings.remindersEnabled || payload.remainingWeekHours <= 0) {
    return { scheduled: false };
  }

  const fireAt = nextReminderDate(payload);

  if (!fireAt) {
    return { scheduled: false };
  }

  reminderTimer = setTimeout(() => {
    new Notification({
      title: "Jira time tracking reminder",
      body: `You still have ${formatMissing(payload.remainingWeekHours)} missing this week.`
    }).show();

    scheduleReminder(payload);
  }, fireAt.getTime() - Date.now());

  return { scheduled: true, fireAt: fireAt.toISOString() };
};
