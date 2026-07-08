import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import type {
  AddWorklogRequest,
  AddWorklogResult,
  AppSettings,
  DeleteWorklogRequest,
  DeleteWorklogResult,
  JiraTicket,
  JiraWorklog,
  SyncResult,
  UpdateWorklogRequest,
  UpdateWorklogResult
} from "../../shared/types";
import { nativeApi } from "../api/native";
import { mergeCreatedWorklogIntoSyncResult, mergeUpdatedWorklogIntoSyncResult } from "../domain/syncResult";
import { saveSyncResult as saveSyncResultToStorage } from "../storage/db";
import { formatDuration } from "../utils/date";

export interface JiraWorklogsClient {
  addWorklog(request: AddWorklogRequest): Promise<AddWorklogResult>;
  updateWorklog(request: UpdateWorklogRequest): Promise<UpdateWorklogResult>;
  deleteWorklog(request: DeleteWorklogRequest): Promise<DeleteWorklogResult>;
}

export interface JiraWorklogPayload {
  issueKey: string;
  ticket: JiraTicket;
  timeSpentSeconds: number;
  startedISO: string;
  comment?: string;
}

interface UseJiraWorklogsOptions {
  settings: AppSettings;
  syncResult?: SyncResult;
  editingWorklog?: JiraWorklog;
  isDemo: boolean;
  client?: JiraWorklogsClient;
  saveSyncResult?: (result: SyncResult) => Promise<void>;
  runSync: (
    settingsForSync?: AppSettings,
    options?: { queueAfterCurrent?: boolean }
  ) => Promise<SyncResult | undefined>;
  loadTickets: (settingsForLoad?: AppSettings) => Promise<unknown>;
  onSyncResult: (result: SyncResult) => void;
  setEditingWorklog: Dispatch<SetStateAction<JiraWorklog | undefined>>;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

export const useJiraWorklogs = ({
  settings,
  syncResult,
  editingWorklog,
  isDemo,
  client = nativeApi,
  saveSyncResult = saveSyncResultToStorage,
  runSync,
  loadTickets,
  onSyncResult,
  setEditingWorklog,
  showSuccess,
  showError
}: UseJiraWorklogsOptions) => {
  const [isLogging, setIsLogging] = useState(false);
  const [isDeletingWorklog, setIsDeletingWorklog] = useState(false);
  const [logError, setLogError] = useState<string | undefined>();

  const handleAddWorklog = useCallback(
    async (payload: JiraWorklogPayload) => {
      setIsLogging(true);
      setLogError(undefined);

      try {
        if (isDemo) {
          showSuccess(`Demo logged ${formatDuration(payload.timeSpentSeconds / 3600)} to ${payload.issueKey}.`);
          return true;
        }

        const { ticket, ...worklogPayload } = payload;
        const result = await client.addWorklog({ settings, ...worklogPayload });
        showSuccess(`Logged ${formatDuration(result.timeSpentSeconds / 3600)} to ${result.issueKey}.`);
        const syncedResult = await runSync(settings, { queueAfterCurrent: true });
        const mergedSyncResult = mergeCreatedWorklogIntoSyncResult(syncedResult ?? syncResult, {
          ticket,
          worklogId: result.worklogId,
          startedISO: payload.startedISO,
          timeSpentSeconds: result.timeSpentSeconds,
          comment: payload.comment,
          syncedAtISO: new Date().toISOString()
        });

        if (mergedSyncResult && mergedSyncResult !== syncedResult && mergedSyncResult !== syncResult) {
          await saveSyncResult(mergedSyncResult);
          onSyncResult(mergedSyncResult);
        }
        await loadTickets();
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to log time to Jira.";
        setLogError(message);
        showError(message);
        return false;
      } finally {
        setIsLogging(false);
      }
    },
    [client, isDemo, loadTickets, onSyncResult, runSync, saveSyncResult, settings, showError, showSuccess, syncResult]
  );

  const handleUpdateWorklog = useCallback(
    async (payload: JiraWorklogPayload) => {
      if (!editingWorklog) {
        return false;
      }

      setIsLogging(true);
      setLogError(undefined);

      try {
        if (isDemo) {
          showSuccess(`Demo updated ${formatDuration(payload.timeSpentSeconds / 3600)} on ${editingWorklog.issueKey}.`);
          return true;
        }

        const result = await client.updateWorklog({
          settings,
          issueKey: editingWorklog.issueKey,
          worklogId: editingWorklog.id,
          timeSpentSeconds: payload.timeSpentSeconds,
          startedISO: payload.startedISO,
          comment: payload.comment
        });
        showSuccess(`Updated ${formatDuration(result.timeSpentSeconds / 3600)} on ${result.issueKey}.`);
        await runSync(settings, { queueAfterCurrent: true });
        await loadTickets();
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to update Jira worklog.";
        setLogError(message);
        showError(message);
        return false;
      } finally {
        setIsLogging(false);
      }
    },
    [client, editingWorklog, isDemo, loadTickets, runSync, settings, showError, showSuccess]
  );

  // Drag move/resize from the calendar: apply the geometry optimistically to the
  // cached result, persist it, then fire a single Jira update — NO full re-sync, which
  // would flash the whole view on every drop. Roll back the cache on failure.
  const handleMoveWorklog = useCallback(
    async (worklog: JiraWorklog, patch: { startedISO: string; timeSpentSeconds: number }) => {
      const optimistic = mergeUpdatedWorklogIntoSyncResult(syncResult, {
        worklogId: worklog.id,
        startedISO: patch.startedISO,
        timeSpentSeconds: patch.timeSpentSeconds,
        comment: worklog.comment,
        syncedAtISO: syncResult?.syncedAt
      });

      if (isDemo) {
        if (optimistic && optimistic !== syncResult) {
          onSyncResult(optimistic);
        }
        return true;
      }

      if (optimistic && optimistic !== syncResult) {
        onSyncResult(optimistic);
        await saveSyncResult(optimistic);
      }

      try {
        await client.updateWorklog({
          settings,
          issueKey: worklog.issueKey,
          worklogId: worklog.id,
          timeSpentSeconds: patch.timeSpentSeconds,
          startedISO: patch.startedISO,
          comment: worklog.comment
        });
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to update Jira worklog.";
        setLogError(message);
        showError(message);
        // Reconcile from the server rather than restoring a snapshot captured at call
        // time — a concurrent drag may have applied newer optimistic state that a stale
        // snapshot would clobber. If the reconcile also fails, the next sync corrects it.
        try {
          const fresh = await runSync(settings, { queueAfterCurrent: true });
          if (fresh) {
            onSyncResult(fresh);
            await saveSyncResult(fresh);
          }
        } catch {
          /* leave optimistic state in place */
        }
        return false;
      }
    },
    [client, isDemo, onSyncResult, runSync, saveSyncResult, setLogError, settings, showError, syncResult]
  );

  const handleDeleteWorklog = useCallback(async () => {
    if (!editingWorklog) {
      return false;
    }

    setIsDeletingWorklog(true);
    setLogError(undefined);

    try {
      if (isDemo) {
        showSuccess(`Demo deleted worklog from ${editingWorklog.issueKey}.`);
        setEditingWorklog(undefined);
        return true;
      }

      const result = await client.deleteWorklog({
        settings,
        issueKey: editingWorklog.issueKey,
        worklogId: editingWorklog.id
      });
      showSuccess(`Deleted worklog from ${result.issueKey}.`);
      await runSync(settings, { queueAfterCurrent: true });
      await loadTickets();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete Jira worklog.";
      setLogError(message);
      showError(message);
      return false;
    } finally {
      setIsDeletingWorklog(false);
    }
  }, [client, editingWorklog, isDemo, loadTickets, runSync, setEditingWorklog, settings, showError, showSuccess]);

  return {
    isLogging,
    isDeletingWorklog,
    logError,
    setIsLogging,
    setLogError,
    handleAddWorklog,
    handleUpdateWorklog,
    handleMoveWorklog,
    handleDeleteWorklog
  };
};
