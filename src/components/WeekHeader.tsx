import { CalendarRange, Columns3, Loader2, Plus, RotateCw } from "lucide-react";
import { formatHours, formatWeekRangeCompact, getIsoWeekNumber } from "../utils/date";
import { ProgressRing } from "./ProgressRing";
import { TimeSplit } from "./TimeSplit";
import { WeekNavigator } from "./WeekNavigator";

export interface WeekHeaderProps {
  weekStart: Date;
  remainingWeekHours: number;
  trackedWeekHours: number;
  /** Jira-synced (billable) hours this week; the rest of `trackedWeekHours` is local. */
  billableWeekHours: number;
  weeklyTargetHours: number;
  isSyncing: boolean;
  isConfigured: boolean;
  viewMode: "summary" | "timeline";
  onViewModeChange: (mode: "summary" | "timeline") => void;
  onSync: () => void;
  onAddTime: () => void;
  onPreviousWeek: () => void;
  onCurrentWeek: () => void;
  onNextWeek: () => void;
}

export const WeekHeader = ({
  weekStart,
  remainingWeekHours,
  trackedWeekHours,
  billableWeekHours,
  weeklyTargetHours,
  isSyncing,
  isConfigured,
  viewMode,
  onViewModeChange,
  onSync,
  onAddTime,
  onPreviousWeek,
  onCurrentWeek,
  onNextWeek
}: WeekHeaderProps) => {
  const weekNumber = getIsoWeekNumber(weekStart);
  const rangeLabel = formatWeekRangeCompact(weekStart);
  const pct = weeklyTargetHours > 0 ? Math.min((trackedWeekHours / weeklyTargetHours) * 100, 100) : 0;

  return (
    <div className="week-header">
      <div className="week-headline">
        <ProgressRing pct={pct} ariaLabel={`${Math.round(pct)} percent of weekly target`} />
        <div>
          <div className="eyebrow">
            WEEK {weekNumber} — {rangeLabel}
          </div>
          <div className="week-figure">
            {formatHours(remainingWeekHours)}
            <span className="unit"> left</span>
            <span className="week-figure-sub">
              {" "}
              · {formatHours(trackedWeekHours)} / {formatHours(weeklyTargetHours)}
            </span>
          </div>
          {trackedWeekHours > 0.01 && (
            <TimeSplit
              billableHours={billableWeekHours}
              localHours={Math.max(trackedWeekHours - billableWeekHours, 0)}
              size="lg"
              className="week-split"
            />
          )}
        </div>
      </div>

      <div className="week-actions">
        <button
          type="button"
          className="sync-button"
          onClick={onSync}
          disabled={isSyncing || !isConfigured}
          title={isConfigured ? "Sync with Jira" : "Connect Jira in settings to sync"}
        >
          {isSyncing ? <Loader2 className="spin" size={14} /> : <RotateCw size={14} strokeWidth={2} />}
          SYNC
        </button>
        <button type="button" className="add-time-button" onClick={() => onAddTime()}>
          <Plus size={14} strokeWidth={2.6} />
          ADD TIME
        </button>
        <div className="week-view-switch" role="group" aria-label="Week view layout">
          <button
            type="button"
            className={viewMode === "summary" ? "is-active" : ""}
            aria-pressed={viewMode === "summary"}
            title="Show compact day summaries"
            onClick={() => onViewModeChange("summary")}
          >
            <Columns3 size={13} strokeWidth={1.9} />
            <span>SUMMARY</span>
          </button>
          <button
            type="button"
            className={viewMode === "timeline" ? "is-active" : ""}
            aria-pressed={viewMode === "timeline"}
            title="Show days on a shared timeline"
            onClick={() => onViewModeChange("timeline")}
          >
            <CalendarRange size={13} strokeWidth={1.9} />
            <span>TIMELINE</span>
          </button>
        </div>
        <div className="week-divider" />
        <WeekNavigator
          onPreviousWeek={onPreviousWeek}
          onCurrentWeek={onCurrentWeek}
          onNextWeek={onNextWeek}
        />
      </div>
    </div>
  );
};
