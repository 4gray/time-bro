import { ChevronLeft, ChevronRight, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import type { SyncResult, WeekState } from "../../shared/types";
import { DayCard } from "./DayCard";
import { ProgressRing } from "./ProgressRing";
import { formatDuration, formatHours } from "../utils/date";

interface WeekDashboardProps {
  weekState: WeekState;
  syncResult?: SyncResult;
  isSyncing: boolean;
  syncError?: string;
  syncMessage?: string;
  onPreviousWeek: () => void;
  onCurrentWeek: () => void;
  onNextWeek: () => void;
  onSync: () => void;
  onToggleSkipped: (dateKey: string) => void;
}

const formatLastSynced = (syncResult?: SyncResult) => {
  if (!syncResult) {
    return "Never synced";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(syncResult.syncedAt));
};

export const WeekDashboard = ({
  weekState,
  syncResult,
  isSyncing,
  syncError,
  syncMessage,
  onPreviousWeek,
  onCurrentWeek,
  onNextWeek,
  onSync,
  onToggleSkipped
}: WeekDashboardProps) => {
  const progress = weekState.weeklyTargetHours > 0
    ? (weekState.trackedWeekHours / weekState.weeklyTargetHours) * 100
    : 0;

  return (
    <main className="content-shell">
      <header className="command-bar">
        <div>
          <h1>Jira Week Tracker</h1>
          <p>{weekState.weekRangeLabel}</p>
        </div>

        <div className="week-controls" aria-label="Week navigation">
          <button className="icon-button" type="button" onClick={onPreviousWeek} title="Previous week">
            <ChevronLeft size={18} />
          </button>
          <button className="secondary-button" type="button" onClick={onCurrentWeek}>
            <RotateCcw size={16} />
            Current week
          </button>
          <button className="icon-button" type="button" onClick={onNextWeek} title="Next week">
            <ChevronRight size={18} />
          </button>
        </div>
      </header>

      <section className="summary-band" aria-label="Weekly tracking summary">
        <div className="summary-copy">
          <span>Remaining this week</span>
          <strong>{formatDuration(weekState.remainingWeekHours)}</strong>
          <p>
            {formatHours(weekState.trackedWeekHours)} tracked against a {formatHours(weekState.weeklyTargetHours)} target.
          </p>
        </div>

        <ProgressRing value={progress} label="tracked" />

        <div className="summary-stats">
          <div>
            <span>Daily target</span>
            <strong>{formatHours(weekState.dailyTargetHours)}</strong>
          </div>
          <div>
            <span>Active days</span>
            <strong>{weekState.activeWorkingDates.length}</strong>
          </div>
          <div>
            <span>Last synced</span>
            <strong>{formatLastSynced(syncResult)}</strong>
          </div>
        </div>

        <button className="primary-button" type="button" onClick={onSync} disabled={isSyncing}>
          {isSyncing ? <Loader2 className="spin" size={17} /> : <RefreshCw size={17} />}
          Sync Jira worklogs
        </button>
      </section>

      {(syncError || syncMessage) && (
        <div className={`status-callout ${syncError ? "error" : "success"}`} role="status">
          {syncError ?? syncMessage}
        </div>
      )}

      <section className="dashboard-grid">
        <div className="weekday-track">
          {weekState.days.map((day) => (
            <DayCard day={day} key={day.dateKey} onToggleSkipped={onToggleSkipped} />
          ))}
        </div>
      </section>
    </main>
  );
};
