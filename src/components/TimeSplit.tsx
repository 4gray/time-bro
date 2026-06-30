import { ArrowUp, Check } from "lucide-react";
import { formatDuration } from "../utils/date";

interface TimeSplitProps {
  /** Hours synced to Jira — billable. */
  billableHours: number;
  /** Hours that live only locally (notes + recurring) — not yet in Jira. */
  localHours: number;
  /** Larger type for the hero (Today) and report headers. */
  size?: "sm" | "lg";
  className?: string;
}

const EPS = 0.01;

/**
 * One-line billable-vs-local readout. Teal = official (in Jira); amber "to log"
 * is the gentle nag toward getting every worked hour tracked. When nothing is
 * outstanding it collapses to a quiet green "all billable" confirmation.
 */
export const TimeSplit = ({ billableHours, localHours, size = "sm", className }: TimeSplitProps) => {
  const hasLocal = localHours > EPS;
  const hasBillable = billableHours > EPS;
  if (!hasLocal && !hasBillable) {
    return null;
  }
  const iconSize = size === "lg" ? 14 : 12;
  return (
    <div className={`time-split is-${size}${className ? ` ${className}` : ""}`}>
      <span className={`ts-billable${!hasLocal ? " is-clear" : ""}`}>
        {hasLocal ? (
          <span className="ts-dot" aria-hidden />
        ) : (
          <Check className="ts-icon" size={iconSize} strokeWidth={2.4} aria-hidden />
        )}
        {formatDuration(billableHours)} billable
      </span>
      {hasLocal && (
        <span className="ts-local">
          <ArrowUp className="ts-icon" size={iconSize} strokeWidth={2.3} aria-hidden />
          {formatDuration(localHours)} to log
        </span>
      )}
    </div>
  );
};
