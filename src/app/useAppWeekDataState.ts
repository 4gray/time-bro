import { useState } from "react";
import type { PersonalNote, SyncResult } from "../../shared/types";

interface UseAppWeekDataStateOptions {
  demoSyncResult?: SyncResult;
  demoPersonalNotes?: PersonalNote[];
}

export const useAppWeekDataState = ({ demoSyncResult, demoPersonalNotes }: UseAppWeekDataStateOptions = {}) => {
  const [syncResult, setSyncResult] = useState<SyncResult | undefined>(() => demoSyncResult);
  const [personalNotes, setPersonalNotes] = useState<PersonalNote[]>(() => demoPersonalNotes ?? []);

  return {
    syncResult,
    setSyncResult,
    personalNotes,
    setPersonalNotes
  };
};
