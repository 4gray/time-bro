import { useEffect, useState } from "react";
import type {
  AppSettings,
  PersonalNote,
  RecurringEvent,
  RecurringOccurrence,
  SyncResult,
  WeekOverride,
  WeekState
} from "../../shared/types";
import { buildMonthState, getMonthWeekStarts, type MonthState } from "../domain/month";
import { buildWeekState } from "../domain/week";
import {
  getPersonalNotes,
  getRecurringOccurrences,
  getSyncResult,
  getWeekOverride
} from "../storage/db";
import { toLocalDateKey } from "../utils/date";

export interface MonthStateStorageClient {
  getWeekOverride(weekKey: string): Promise<WeekOverride>;
  getSyncResult(weekKey: string): Promise<SyncResult | undefined>;
  getPersonalNotes(weekKey: string): Promise<PersonalNote[]>;
  getRecurringOccurrences(weekKey: string): Promise<RecurringOccurrence[]>;
}

interface UseMonthStateOptions {
  isMonthView: boolean;
  isBooting: boolean;
  monthAnchor: Date;
  currentDate: Date;
  settings: AppSettings;
  visibleWeekState: WeekState;
  recurringEvents: RecurringEvent[];
  recurringOccurrences: RecurringOccurrence[];
  demoWeekStart?: Date;
  demoWeekOverride?: WeekOverride;
  demoSyncResult?: SyncResult;
  storage?: MonthStateStorageClient;
  onError: (message: string) => void;
}

const defaultStorage: MonthStateStorageClient = {
  getWeekOverride,
  getSyncResult,
  getPersonalNotes,
  getRecurringOccurrences
};

export const useMonthState = ({
  isMonthView,
  isBooting,
  monthAnchor,
  currentDate,
  settings,
  visibleWeekState,
  recurringEvents,
  recurringOccurrences,
  demoWeekStart,
  demoWeekOverride,
  demoSyncResult,
  storage = defaultStorage,
  onError
}: UseMonthStateOptions) => {
  const [monthState, setMonthState] = useState<MonthState | undefined>();

  useEffect(() => {
    if (!isMonthView || isBooting) {
      return;
    }

    let isMounted = true;

    const loadMonth = async () => {
      const demoWeekKey = demoWeekStart ? toLocalDateKey(demoWeekStart) : undefined;
      const weekStarts = getMonthWeekStarts(monthAnchor);
      const weekStates = await Promise.all(
        weekStarts.map(async (start) => {
          const weekKey = toLocalDateKey(start);
          if (weekKey === visibleWeekState.weekKey) {
            return visibleWeekState;
          }

          if (demoWeekKey && demoWeekOverride) {
            const isDemoWeek = weekKey === demoWeekKey;
            return buildWeekState(
              start,
              settings,
              isDemoWeek ? demoWeekOverride : { weekKey, skippedDates: [] },
              isDemoWeek ? demoSyncResult : undefined,
              [],
              currentDate,
              recurringEvents,
              isDemoWeek ? recurringOccurrences : []
            );
          }

          const [storedOverride, storedSyncResult, storedPersonalNotes, storedRecurringOccurrences] =
            await Promise.all([
              storage.getWeekOverride(weekKey),
              storage.getSyncResult(weekKey),
              storage.getPersonalNotes(weekKey),
              storage.getRecurringOccurrences(weekKey)
            ]);
          return buildWeekState(
            start,
            settings,
            storedOverride,
            storedSyncResult,
            storedPersonalNotes,
            currentDate,
            recurringEvents,
            storedRecurringOccurrences
          );
        })
      );

      if (!isMounted) {
        return;
      }

      setMonthState(buildMonthState(monthAnchor, currentDate, settings, weekStates));
    };

    loadMonth().catch((error) => {
      console.error(error);
      if (isMounted) {
        onError("Unable to load the selected month.");
      }
    });

    return () => {
      isMounted = false;
    };
  }, [
    currentDate,
    demoSyncResult,
    demoWeekOverride,
    demoWeekStart,
    isBooting,
    isMonthView,
    monthAnchor,
    onError,
    recurringEvents,
    recurringOccurrences,
    settings,
    storage,
    visibleWeekState
  ]);

  return monthState;
};
