import { useState } from "react";
import type { RecurringEvent, RecurringOccurrence } from "../../shared/types";
import { buildDefaultRecurringEvents } from "../domain/recurring";

interface UseAppRecurringStateOptions {
  isDemo: boolean;
  demoRecurringOccurrences?: RecurringOccurrence[];
}

export const useAppRecurringState = ({ isDemo, demoRecurringOccurrences }: UseAppRecurringStateOptions) => {
  const [recurringEvents, setRecurringEvents] = useState<RecurringEvent[]>(() =>
    isDemo ? buildDefaultRecurringEvents() : []
  );
  const [recurringOccurrences, setRecurringOccurrences] = useState<RecurringOccurrence[]>(
    () => demoRecurringOccurrences ?? []
  );

  return {
    recurringEvents,
    setRecurringEvents,
    recurringOccurrences,
    setRecurringOccurrences
  };
};
