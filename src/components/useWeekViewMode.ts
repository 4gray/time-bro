import { useCallback, useState } from "react";

export type WeekViewMode = "summary" | "timeline";

export const WEEK_VIEW_MODE_STORAGE_KEY = "timebro-week-view-mode";

const readStoredMode = (): WeekViewMode => {
  if (typeof window === "undefined") {
    return "summary";
  }
  try {
    return window.localStorage.getItem(WEEK_VIEW_MODE_STORAGE_KEY) === "timeline" ? "timeline" : "summary";
  } catch {
    return "summary";
  }
};

/** Keeps the compact/timeline choice local to this installation. */
export const useWeekViewMode = () => {
  const [mode, setMode] = useState<WeekViewMode>(readStoredMode);

  const selectMode = useCallback((next: WeekViewMode) => {
    setMode(next);
    try {
      window.localStorage.setItem(WEEK_VIEW_MODE_STORAGE_KEY, next);
    } catch {
      // localStorage can be unavailable in restricted previews.
    }
  }, []);

  return { mode, selectMode };
};
