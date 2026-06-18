export const WEEKDAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
export const SHORT_WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;

export const addDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

export const startOfWeekMonday = (date: Date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = start.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + offset);
  start.setHours(0, 0, 0, 0);
  return start;
};

export const toLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const fromLocalDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const isoWeekday = (date: Date) => {
  const day = date.getDay();
  return day === 0 ? 7 : day;
};

export const formatWeekRange = (weekStart: Date) => {
  const weekEnd = addDays(weekStart, 6);
  const sameYear = weekStart.getFullYear() === weekEnd.getFullYear();
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const monthFormatter = new Intl.DateTimeFormat(undefined, { month: "short" });

  if (sameMonth && sameYear) {
    return `${monthFormatter.format(weekStart)} ${weekStart.getDate()} - ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
  }

  if (sameYear) {
    return `${monthFormatter.format(weekStart)} ${weekStart.getDate()} - ${monthFormatter.format(weekEnd)} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
  }

  return `${monthFormatter.format(weekStart)} ${weekStart.getDate()}, ${weekStart.getFullYear()} - ${monthFormatter.format(weekEnd)} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
};

export const formatShortDate = (date: Date) => {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric"
  }).format(date);
};

export const formatHours = (hours: number, maxFractions = 1) => {
  const safeHours = Number.isFinite(hours) ? hours : 0;
  return `${safeHours.toLocaleString(undefined, {
    minimumFractionDigits: safeHours % 1 === 0 ? 0 : 1,
    maximumFractionDigits: maxFractions
  })}h`;
};

export const formatDuration = (hours: number) => {
  const totalMinutes = Math.max(Math.round(hours * 60), 0);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${wholeHours}h` : `${wholeHours}h ${String(minutes).padStart(2, "0")}m`;
};
