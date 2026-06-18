import { CheckCircle2, CircleAlert, Clock3, Plane, TimerReset } from "lucide-react";
import type { DayTrackingSummary } from "../../shared/types";
import { formatHours } from "../utils/date";

interface DayCardProps {
  day: DayTrackingSummary;
  onToggleSkipped: (dateKey: string) => void;
}

const getCardState = (day: DayTrackingSummary) => {
  if (!day.isConfiguredWorkingDay || day.isSkipped) {
    return "skipped";
  }

  if (day.missingHours === 0 && day.targetHours > 0) {
    return "complete";
  }

  return "missing";
};

export const DayCard = ({ day, onToggleSkipped }: DayCardProps) => {
  const state = getCardState(day);
  const stateLabel =
    state === "complete" ? "Complete" : state === "skipped" ? "Skipped" : `${formatHours(day.missingHours)} missing`;

  return (
    <article className={`day-card ${state} ${day.isToday ? "today" : ""}`}>
      <div className="day-card-top">
        <div>
          <span className="weekday">{day.weekdayName}</span>
          <strong>{day.dateLabel}</strong>
        </div>
        <div className="state-icon" title={stateLabel} aria-label={stateLabel}>
          {state === "complete" ? <CheckCircle2 size={18} /> : state === "skipped" ? <Plane size={18} /> : <CircleAlert size={18} />}
        </div>
      </div>

      {day.isToday && <div className="today-strip">Today</div>}

      <div className="day-metrics">
        <div>
          <span>Target</span>
          <strong>{formatHours(day.targetHours)}</strong>
        </div>
        <div>
          <span>Tracked</span>
          <strong>{formatHours(day.trackedHours)}</strong>
        </div>
        <div>
          <span>Missing</span>
          <strong>{formatHours(day.missingHours)}</strong>
        </div>
      </div>

      <button
        className={`skip-toggle ${day.isSkipped ? "checked" : ""}`}
        type="button"
        onClick={() => onToggleSkipped(day.dateKey)}
        aria-pressed={day.isSkipped}
      >
        <span className="toggle-dot" />
        <span>Vacation / skip day</span>
      </button>

      <div className="issue-list">
        <div className="issue-list-title">
          <Clock3 size={14} />
          Jira worklogs
        </div>
        {day.issues.length > 0 ? (
          day.issues.slice(0, 4).map((issue) => (
            <a className="issue-row" href={issue.url} key={issue.key} target="_blank" rel="noreferrer">
              <span className="issue-row-main">
                <span className="issue-key">{issue.key}</span>
                <strong>{formatHours(issue.loggedSeconds / 3600)}</strong>
              </span>
              <span className="issue-title" title={issue.summary}>
                {issue.summary}
              </span>
              {issue.comments?.length ? (
                <span className="worklog-comments">
                  {issue.comments.slice(0, 2).map((comment, index) => (
                    <span className="worklog-comment" title={comment} key={`${issue.key}-comment-${index}`}>
                      {comment}
                    </span>
                  ))}
                </span>
              ) : null}
            </a>
          ))
        ) : (
          <div className="empty-issues">
            <TimerReset size={15} />
            No synced worklogs
          </div>
        )}
      </div>
    </article>
  );
};
