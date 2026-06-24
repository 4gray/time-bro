import { useEffect, useRef } from "react";
import type {
  AppSettings,
  BitbucketReviewSyncResult,
  PersonalNote,
  RecurringEvent,
  RecurringOccurrence,
  SyncResult,
  WeekOverride
} from "../../shared/types";
import { buildDefaultRecurringEvents } from "../domain/recurring";
import {
  getBitbucketReviewResult,
  getFavoriteKeys,
  getPersonalNotes,
  getRecurringEvents,
  getRecurringOccurrences,
  getSettings,
  getSyncResult,
  getWeekOverride,
  saveRecurringEvents
} from "../storage/db";
import { toLocalDateKey } from "../utils/date";

export interface WeekStorageClient {
  getSettings(): Promise<AppSettings>;
  getWeekOverride(weekKey: string): Promise<WeekOverride>;
  getSyncResult(weekKey: string): Promise<SyncResult | undefined>;
  getFavoriteKeys(): Promise<string[]>;
  getPersonalNotes(weekKey: string): Promise<PersonalNote[]>;
  getBitbucketReviewResult(weekKey: string): Promise<BitbucketReviewSyncResult | undefined>;
  getRecurringEvents(): Promise<RecurringEvent[] | undefined>;
  getRecurringOccurrences(weekKey: string): Promise<RecurringOccurrence[]>;
  saveRecurringEvents(events: RecurringEvent[]): Promise<void>;
}

interface UseWeekStorageOptions {
  isDemo: boolean;
  isBooting: boolean;
  weekStart: Date;
  storage?: WeekStorageClient;
  setSettings: (settings: AppSettings) => void;
  setSettingsDraft: (settings: AppSettings) => void;
  setWeekOverride: (override: WeekOverride) => void;
  setSyncResult: (result: SyncResult | undefined) => void;
  setFavoriteKeys: (keys: string[]) => void;
  setPersonalNotes: (notes: PersonalNote[]) => void;
  setBitbucketReviewResult: (result: BitbucketReviewSyncResult | undefined) => void;
  setRecurringEvents: (events: RecurringEvent[]) => void;
  setRecurringOccurrences: (occurrences: RecurringOccurrence[]) => void;
  setIsBooting: (isBooting: boolean) => void;
  showError: (message: string) => void;
}

const defaultStorage: WeekStorageClient = {
  getSettings,
  getWeekOverride,
  getSyncResult,
  getFavoriteKeys,
  getPersonalNotes,
  getBitbucketReviewResult,
  getRecurringEvents,
  getRecurringOccurrences,
  saveRecurringEvents
};

export const useWeekStorage = ({
  isDemo,
  isBooting,
  weekStart,
  storage = defaultStorage,
  setSettings,
  setSettingsDraft,
  setWeekOverride,
  setSyncResult,
  setFavoriteKeys,
  setPersonalNotes,
  setBitbucketReviewResult,
  setRecurringEvents,
  setRecurringOccurrences,
  setIsBooting,
  showError
}: UseWeekStorageOptions) => {
  const skipInitialWeekReloadRef = useRef(false);

  useEffect(() => {
    if (isDemo || !isBooting) {
      return;
    }

    let isMounted = true;

    const loadInitialState = async () => {
      const weekKey = toLocalDateKey(weekStart);
      const [
        storedSettings,
        storedOverride,
        storedSyncResult,
        storedFavorites,
        storedPersonalNotes,
        storedBitbucketReviewResult,
        storedRecurringEvents,
        storedRecurringOccurrences
      ] = await Promise.all([
        storage.getSettings(),
        storage.getWeekOverride(weekKey),
        storage.getSyncResult(weekKey),
        storage.getFavoriteKeys(),
        storage.getPersonalNotes(weekKey),
        storage.getBitbucketReviewResult(weekKey),
        storage.getRecurringEvents(),
        storage.getRecurringOccurrences(weekKey)
      ]);

      if (!isMounted) {
        return;
      }

      // Seed the prototype defaults the first time the feature is opened so it
      // is discoverable rather than empty; persist so the seed is stable.
      let recurringEventsToUse = storedRecurringEvents;
      if (!recurringEventsToUse) {
        recurringEventsToUse = buildDefaultRecurringEvents();
        await storage.saveRecurringEvents(recurringEventsToUse);
      }

      if (!isMounted) {
        return;
      }

      setSettings(storedSettings);
      setSettingsDraft(storedSettings);
      setWeekOverride(storedOverride);
      setSyncResult(storedSyncResult);
      setFavoriteKeys(storedFavorites);
      setPersonalNotes(storedPersonalNotes);
      setBitbucketReviewResult(storedBitbucketReviewResult);
      setRecurringEvents(recurringEventsToUse);
      setRecurringOccurrences(storedRecurringOccurrences);
      skipInitialWeekReloadRef.current = true;
      setIsBooting(false);
    };

    loadInitialState().catch((error) => {
      console.error(error);
      if (isMounted) {
        setIsBooting(false);
        showError("Unable to load local tracker data.");
      }
    });

    return () => {
      isMounted = false;
    };
  }, [
    isBooting,
    isDemo,
    setBitbucketReviewResult,
    setFavoriteKeys,
    setIsBooting,
    setPersonalNotes,
    setRecurringEvents,
    setRecurringOccurrences,
    setSettings,
    setSettingsDraft,
    setSyncResult,
    setWeekOverride,
    showError,
    storage,
    weekStart
  ]);

  useEffect(() => {
    if (isDemo || isBooting) {
      return;
    }

    if (skipInitialWeekReloadRef.current) {
      skipInitialWeekReloadRef.current = false;
      return;
    }

    let isMounted = true;
    const weekKey = toLocalDateKey(weekStart);

    const loadWeek = async () => {
      const [
        storedOverride,
        storedSyncResult,
        storedPersonalNotes,
        storedBitbucketReviewResult,
        storedRecurringOccurrences
      ] = await Promise.all([
        storage.getWeekOverride(weekKey),
        storage.getSyncResult(weekKey),
        storage.getPersonalNotes(weekKey),
        storage.getBitbucketReviewResult(weekKey),
        storage.getRecurringOccurrences(weekKey)
      ]);

      if (!isMounted) {
        return;
      }

      setWeekOverride(storedOverride);
      setSyncResult(storedSyncResult);
      setPersonalNotes(storedPersonalNotes);
      setBitbucketReviewResult(storedBitbucketReviewResult);
      setRecurringOccurrences(storedRecurringOccurrences);
    };

    loadWeek().catch((error) => {
      console.error(error);
      if (isMounted) {
        showError("Unable to load the selected week.");
      }
    });

    return () => {
      isMounted = false;
    };
  }, [
    isBooting,
    isDemo,
    setBitbucketReviewResult,
    setPersonalNotes,
    setRecurringOccurrences,
    setSyncResult,
    setWeekOverride,
    showError,
    storage,
    weekStart
  ]);
};
