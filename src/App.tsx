import { useEffect, useMemo, useState } from "react";
import type { AppSettings, JiraConnectionResult, SyncResult, WeekOverride } from "../shared/types";
import { nativeApi } from "./api/native";
import { SettingsView } from "./components/SettingsView";
import { Sidebar } from "./components/Sidebar";
import { WeekDashboard } from "./components/WeekDashboard";
import { buildWeekState, DEFAULT_SETTINGS, getWeekBounds } from "./domain/week";
import {
  getSettings,
  getSyncResult,
  getWeekOverride,
  saveSettings,
  saveSyncResult,
  saveWeekOverride
} from "./storage/db";
import { addDays, toLocalDateKey } from "./utils/date";

type View = "dashboard" | "settings";

const normalizeJiraSiteInput = (rawSite: string) => {
  const trimmed = rawSite.trim().replace(/\/+$/, "");

  if (!trimmed) {
    return "";
  }

  const candidate = trimmed.includes("://")
    ? trimmed
    : `https://${trimmed.includes(".") ? trimmed : `${trimmed}.atlassian.net`}`;

  try {
    const url = new URL(candidate);
    return `${url.protocol}//${url.host}`;
  } catch {
    return trimmed;
  }
};

export const App = () => {
  const [view, setView] = useState<View>("dashboard");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [settingsDraft, setSettingsDraft] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [weekStart, setWeekStart] = useState(() => getWeekBounds(new Date()).weekStart);
  const [weekOverride, setWeekOverride] = useState<WeekOverride>(() => ({
    weekKey: toLocalDateKey(getWeekBounds(new Date()).weekStart),
    skippedDates: []
  }));
  const [syncResult, setSyncResult] = useState<SyncResult | undefined>();
  const [isBooting, setIsBooting] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [syncError, setSyncError] = useState<string | undefined>();
  const [syncMessage, setSyncMessage] = useState<string | undefined>();
  const [savedMessage, setSavedMessage] = useState<string | undefined>();
  const [testResult, setTestResult] = useState<JiraConnectionResult | undefined>();

  const weekState = useMemo(
    () => buildWeekState(weekStart, settings, weekOverride, syncResult),
    [settings, syncResult, weekOverride, weekStart]
  );

  useEffect(() => {
    let isMounted = true;

    const loadInitialState = async () => {
      const [storedSettings, storedOverride, storedSyncResult] = await Promise.all([
        getSettings(),
        getWeekOverride(toLocalDateKey(weekStart)),
        getSyncResult(toLocalDateKey(weekStart))
      ]);

      if (!isMounted) {
        return;
      }

      setSettings(storedSettings);
      setSettingsDraft(storedSettings);
      setWeekOverride(storedOverride);
      setSyncResult(storedSyncResult);
      setIsBooting(false);
    };

    loadInitialState().catch((error) => {
      console.error(error);
      setIsBooting(false);
      setSyncError("Unable to load local tracker data.");
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const weekKey = toLocalDateKey(weekStart);

    const loadWeek = async () => {
      const [storedOverride, storedSyncResult] = await Promise.all([
        getWeekOverride(weekKey),
        getSyncResult(weekKey)
      ]);

      if (!isMounted) {
        return;
      }

      setWeekOverride(storedOverride);
      setSyncResult(storedSyncResult);
      setSyncError(undefined);
      setSyncMessage(undefined);
    };

    loadWeek().catch((error) => {
      console.error(error);
      setSyncError("Unable to load the selected week.");
    });

    return () => {
      isMounted = false;
    };
  }, [weekStart]);

  useEffect(() => {
    nativeApi.scheduleReminder({
      settings,
      weekKey: weekState.weekKey,
      skippedDates: weekState.skippedDates,
      remainingWeekHours: weekState.remainingWeekHours,
      todayDateKey: toLocalDateKey(new Date())
    });
  }, [settings, weekState.weekKey, weekState.remainingWeekHours, weekState.skippedDates]);

  const goToWeek = (date: Date) => {
    setWeekStart(getWeekBounds(date).weekStart);
  };

  const handleToggleSkipped = async (dateKey: string) => {
    const skippedDates = weekOverride.skippedDates.includes(dateKey)
      ? weekOverride.skippedDates.filter((candidate) => candidate !== dateKey)
      : [...weekOverride.skippedDates, dateKey].sort();
    const nextOverride = {
      weekKey: weekState.weekKey,
      skippedDates
    };

    setWeekOverride(nextOverride);
    await saveWeekOverride(nextOverride);
  };

  const handleSaveSettings = async () => {
    const cleanedSettings: AppSettings = {
      ...settingsDraft,
      jiraBaseUrl: normalizeJiraSiteInput(settingsDraft.jiraBaseUrl),
      jiraEmail: settingsDraft.jiraEmail.trim(),
      weeklyTargetHours: Math.max(Number(settingsDraft.weeklyTargetHours) || 40, 1),
      workingDays: settingsDraft.workingDays.length ? settingsDraft.workingDays : [1, 2, 3, 4, 5]
    };

    await saveSettings(cleanedSettings);
    setSettings(cleanedSettings);
    setSettingsDraft(cleanedSettings);
    setSavedMessage("Settings saved locally.");
    window.setTimeout(() => setSavedMessage(undefined), 2500);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(undefined);

    try {
      const result = await nativeApi.testJiraConnection({
        ...settingsDraft,
        jiraBaseUrl: normalizeJiraSiteInput(settingsDraft.jiraBaseUrl),
        jiraEmail: settingsDraft.jiraEmail.trim()
      });
      setTestResult(result);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncError(undefined);
    setSyncMessage(undefined);

    try {
      const result = await nativeApi.syncJiraWorklogs({
        settings,
        weekKey: weekState.weekKey,
        weekStartISO: weekState.weekStartISO,
        weekEndExclusiveISO: weekState.weekEndExclusiveISO
      });
      await saveSyncResult(result);
      setSyncResult(result);
      setSyncMessage(`Synced ${result.worklogCount} worklogs across ${result.issueCount} candidate issues.`);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Unable to sync Jira worklogs.");
    } finally {
      setIsSyncing(false);
    }
  };

  if (isBooting) {
    return (
      <div className="app-frame boot-screen">
        <div className="boot-card">
          <span className="boot-pulse" />
          <strong>Loading Jira Week Tracker</strong>
          <p>Reading local settings and the selected week.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-frame">
      <Sidebar view={view} onViewChange={setView} />
      {view === "dashboard" ? (
        <WeekDashboard
          weekState={weekState}
          syncResult={syncResult}
          isSyncing={isSyncing}
          syncError={syncError}
          syncMessage={syncMessage}
          onPreviousWeek={() => setWeekStart((current) => addDays(current, -7))}
          onCurrentWeek={() => goToWeek(new Date())}
          onNextWeek={() => setWeekStart((current) => addDays(current, 7))}
          onSync={handleSync}
          onToggleSkipped={handleToggleSkipped}
        />
      ) : (
        <SettingsView
          draft={settingsDraft}
          onDraftChange={setSettingsDraft}
          onSave={handleSaveSettings}
          onTestConnection={handleTestConnection}
          isTesting={isTesting}
          testResult={testResult}
          savedMessage={savedMessage}
        />
      )}
    </div>
  );
};
