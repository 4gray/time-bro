import {
  Activity,
  AlertTriangle,
  Bot,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GitCommit,
  GitPullRequest,
  LineChart,
  Loader2,
  Lock,
  Moon,
  PlusCircle,
  Send,
  Sparkles,
  Zap,
  type LucideIcon
} from "lucide-react";
import type { CSSProperties } from "react";
import type {
  ReconstructConfidence,
  ReconstructDay,
  ReconstructSummary,
  SignalKind,
  TimelineRow
} from "../domain/reconstruct";
import { formatReconDuration } from "../domain/reconstruct";

export interface ReconstructDateLabels {
  /** "WEDNESDAY 17 JUNE" */
  longLabel: string;
  /** "WED 17 JUN" */
  shortLabel: string;
}

export interface ReconstructViewProps {
  day: ReconstructDay;
  summary: ReconstructSummary;
  dateLabels: ReconstructDateLabels;
  /** True only when the optional local model is enabled AND reachable/ready. */
  aiOn: boolean;
  /** Full model tag, e.g. "llama3.1:8b". */
  aiModel: string;
  isEnhancing: boolean;
  canStepBack: boolean;
  canStepForward: boolean;
  onStepBack: () => void;
  onStepForward: () => void;
  onOpenSettings: () => void;
  /** AI on → re-draft with the model; AI off → rule-based auto-distribute (core path). */
  onPrimaryAction: () => void;
  /** Log entries for this day (opens the existing Add Time write flow). */
  onLogTime: () => void;
}

const SIGNAL_ACCENT: Record<SignalKind, string> = {
  commit: "var(--blue-soft)",
  pr: "var(--purple)",
  pipe: "var(--amber-soft)",
  jira: "var(--teal)"
};

const SIGNAL_ICON: Record<SignalKind, LucideIcon> = {
  commit: GitCommit,
  pr: GitPullRequest,
  pipe: Activity,
  jira: LineChart
};

const CONFIDENCE: Record<ReconstructConfidence, { label: string; color: string }> = {
  high: { label: "HIGH", color: "var(--teal)" },
  med: { label: "MED", color: "var(--amber-soft)" },
  low: { label: "LOW", color: "var(--muted)" }
};

const accentStyle = (kind: SignalKind | undefined): CSSProperties =>
  ({ "--accent": kind ? SIGNAL_ACCENT[kind] : "var(--border-strong)" } as CSSProperties);

const SignalGlyph = ({ kind, size = 16 }: { kind: SignalKind; size?: number }) => {
  const Icon = SIGNAL_ICON[kind];
  return <Icon size={size} strokeWidth={1.9} />;
};

export const ReconstructView = ({
  day,
  summary,
  dateLabels,
  aiOn,
  aiModel,
  isEnhancing,
  canStepBack,
  canStepForward,
  onStepBack,
  onStepForward,
  onOpenSettings,
  onPrimaryAction,
  onLogTime
}: ReconstructViewProps) => {
  const modelShort = aiModel.split(":")[0] || aiModel;
  const isWeekend = day.kind === "weekend";
  const isComplete = day.kind === "complete";
  const isActive = !isWeekend && !isComplete;
  const showTimeline = isActive || isComplete;

  return (
    <div className="view recon-view">
      {/* ---- header ---- */}
      <header className="recon-header">
        <div className="recon-headline">
          <div className="eyebrow">RECONSTRUCT — {dateLabels.longLabel}</div>
          <div className="recon-total">
            <span className="recon-total-num">
              {summary.bigLabel} <span className="recon-total-word">{summary.bigWord}</span>
            </span>
            <span className="recon-total-sub">{summary.sub}</span>
          </div>
        </div>

        <div className="recon-controls">
          <div className="recon-stepper">
            <button
              type="button"
              className="recon-step"
              onClick={onStepBack}
              disabled={!canStepBack}
              title={canStepBack ? "Previous day" : "Start of the worklog sync window"}
              aria-label="Previous day"
            >
              <ChevronLeft size={15} strokeWidth={2} />
            </button>
            <span className="recon-day-pill">
              <Calendar size={14} strokeWidth={1.7} />
              {dateLabels.shortLabel}
            </span>
            <button
              type="button"
              className="recon-step"
              onClick={onStepForward}
              disabled={!canStepForward}
              title={canStepForward ? "Next day" : "Today — can't reconstruct the future"}
              aria-label="Next day"
            >
              <ChevronRight size={15} strokeWidth={2} />
            </button>
            <span className={`recon-day-tag ${summary.dayTag === "TODAY" ? "is-today" : ""}`}>{summary.dayTag}</span>
          </div>

          <div className="recon-divider" />

          <button
            type="button"
            className={`recon-ai-pill ${aiOn ? "is-on" : "is-off"}`}
            onClick={onOpenSettings}
            title="Local AI status — open Settings"
          >
            <Sparkles size={13} strokeWidth={1.9} />
            <span>{aiOn ? `LOCAL AI · ${modelShort}` : "LOCAL AI OFF"}</span>
          </button>

          {isActive && (
            <button
              type="button"
              className={`recon-primary ${aiOn ? "is-ai" : ""}`}
              onClick={onPrimaryAction}
              disabled={isEnhancing}
            >
              {isEnhancing ? (
                <Loader2 size={15} strokeWidth={2} className="spin" />
              ) : aiOn ? (
                <Sparkles size={15} strokeWidth={2} />
              ) : (
                <Zap size={15} strokeWidth={2} />
              )}
              {aiOn ? (isEnhancing ? "Drafting…" : "Auto-draft all") : "Auto-distribute"}
            </button>
          )}
        </div>
      </header>

      {/* ---- banner ---- */}
      {isComplete && (
        <div className="recon-banner is-complete">
          <CheckCircle2 size={16} strokeWidth={2} />
          <span>
            This day already adds up to <strong>{formatReconDuration(day.targetMinutes)}</strong> — every block is
            logged in Jira. Nothing to reconstruct. Use <span className="mono">‹ ›</span> to pick another day.
          </span>
        </div>
      )}
      {isWeekend && (
        <div className="recon-banner is-rest">
          <Moon size={16} strokeWidth={1.9} />
          <span>
            <strong>Weekend — no work expected.</strong> Nothing to reconstruct. Step to a workday with{" "}
            <span className="mono">‹ ›</span>, or log time anyway if you worked.
          </span>
          <span className="recon-banner-spacer" />
          <button type="button" className="recon-ghost-btn" onClick={onLogTime}>
            LOG TIME ANYWAY
          </button>
        </div>
      )}
      {isActive && aiOn && (
        <div className="recon-banner is-ai">
          <Bot size={16} strokeWidth={1.9} />
          <span>
            Drafts written <strong>on-device by {aiModel}</strong> via Ollama — your commits, diffs and ticket text
            never leave this machine. Review every line before sending to Jira.
          </span>
          <span className="recon-banner-spacer" />
          <span className="recon-localhost">
            <span className="recon-localhost-dot" />
            localhost:11434
          </span>
        </div>
      )}
      {isActive && !aiOn && (
        <div className="recon-banner is-off">
          <AlertTriangle size={16} strokeWidth={1.9} />
          <span>
            <strong>Local AI is off.</strong> Reconstructing from raw signals only — no written notes or gap
            suggestions. Connect a local Ollama model to auto-draft worklog descriptions, all on your device.
          </span>
          <span className="recon-banner-spacer" />
          <button type="button" className="recon-setup-btn" onClick={onOpenSettings}>
            SET UP LOCAL AI
          </button>
        </div>
      )}

      {/* ---- body ---- */}
      <div className="recon-body">
        {/* signals rail */}
        <aside className="recon-rail">
          <div className="recon-rail-head">
            <span className="recon-rail-title">SIGNALS FROM API</span>
            <span className="recon-rail-count">{summary.unplacedLabel}</span>
          </div>
          <p className="recon-rail-help">
            Durations are <span className="recon-em">estimates</span> from commit and PR timestamps. Add them by hand or
            let a local model place them — no model required to review.
          </p>

          <div className="recon-rail-list">
            {day.signals.map((signal) => {
              const conf = CONFIDENCE[signal.confidence];
              return (
                <div className="recon-sig" key={signal.id} style={accentStyle(signal.kind)}>
                  <div className="recon-sig-top">
                    <span className="recon-icon-tile">
                      <SignalGlyph kind={signal.kind} />
                    </span>
                    <div className="recon-sig-headline">
                      {signal.key && <span className="recon-key">{signal.key}</span>}
                      <span className="recon-sig-title">{signal.title}</span>
                    </div>
                    <span className={`recon-dur ${signal.isMarker ? "is-marker" : ""}`}>
                      {signal.isMarker ? "marker" : formatReconDuration(signal.durationMinutes, { estimate: true })}
                    </span>
                  </div>
                  <div className="recon-sig-meta">
                    <span className="recon-sig-sub">{signal.sub}</span>
                    <span className="recon-conf" style={{ color: conf.color }}>
                      <span className="recon-conf-dot" style={{ background: conf.color }} />
                      {conf.label}
                    </span>
                  </div>
                </div>
              );
            })}

            {day.signals.length === 0 && (
              <div className="recon-rail-empty">
                <span className="recon-rail-empty-icon">
                  <PlusCircle size={18} strokeWidth={2} />
                </span>
                <div className="recon-rail-empty-title">
                  {isWeekend ? "No activity this day" : "No unplaced signals"}
                </div>
                <div className="recon-rail-empty-text">
                  {isWeekend
                    ? "No commits, PRs or CI runs detected — expected on a day off."
                    : "Every commit, PR and CI run for this day is already reflected in a Jira worklog."}
                </div>
              </div>
            )}
          </div>

          {isActive && (
            <div className="recon-rail-foot">
              <button type="button" className={`recon-rail-btn ${aiOn ? "is-ai" : ""}`} onClick={onPrimaryAction}>
                {aiOn ? <Sparkles size={16} strokeWidth={1.9} /> : <Zap size={16} strokeWidth={1.9} />}
                {aiOn ? "Draft & place everything" : "Distribute everything"}
              </button>
            </div>
          )}
        </aside>

        {/* timeline */}
        <section className="recon-timeline">
          <div className="recon-tl-head">
            <span className="recon-rail-title">WORKING DAY · 09:00 → 18:00</span>
            <div className="recon-legend">
              <span style={accentStyle("commit")}>
                <i className="recon-swatch" />
                commits
              </span>
              <span style={accentStyle("pr")}>
                <i className="recon-swatch" />
                PR
              </span>
              <span style={accentStyle("pipe")}>
                <i className="recon-swatch" />
                CI
              </span>
              <span style={{ "--accent": "var(--border-strong)" } as CSSProperties}>
                <i className="recon-swatch" />
                in Jira
              </span>
            </div>
          </div>

          {isActive && day.loggedMinutes > 0 && (
            <div className="recon-logged-note">
              <Lock size={15} strokeWidth={1.9} />
              <span>
                <span className="mono recon-teal">{formatReconDuration(day.loggedMinutes)}</span> already in Jira — read
                via <span className="mono">worklogDate</span>, never offered twice.
              </span>
            </div>
          )}

          {showTimeline && (
            <div className="recon-tl-list">
              {day.rows.map((row, index) => (
                <TimelineRowView
                  key={`${row.hour}-${index}`}
                  row={row}
                  aiOn={aiOn}
                  modelShort={modelShort}
                  onLogTime={onLogTime}
                />
              ))}
            </div>
          )}

          {isWeekend && (
            <div className="recon-rest-panel">
              <span className="recon-rest-icon">
                <Moon size={28} strokeWidth={1.7} />
              </span>
              <div className="recon-rest-title">Enjoy the weekend</div>
              <p className="recon-rest-text">
                No work is expected on this day, so there&rsquo;s nothing to reconstruct. If you did work, use{" "}
                <span className="mono">Log time anyway</span> above to add an entry by hand.
              </p>
            </div>
          )}

          {showTimeline && (
            <div className="recon-foot">
              <div className={`recon-foot-status ${isComplete ? "is-done" : ""}`}>
                {isComplete ? <Check size={15} strokeWidth={2.2} /> : <AlertTriangle size={15} strokeWidth={1.9} />}
                <span className="mono recon-foot-gap">{summary.gapLabel}</span> {summary.footerTail}
              </div>
              <div className="recon-foot-actions">
                <button
                  type="button"
                  className="recon-send-btn"
                  onClick={onLogTime}
                  disabled={isComplete}
                  title={isComplete ? "Everything is logged" : "Open the Add Time flow to log these entries"}
                >
                  <Send size={15} strokeWidth={2.2} />
                  {summary.sendBtnLabel}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

interface TimelineRowViewProps {
  row: TimelineRow;
  aiOn: boolean;
  modelShort: string;
  onLogTime: () => void;
}

const TimelineRowView = ({ row, aiOn, modelShort, onLogTime }: TimelineRowViewProps) => {
  const showAiDraft = aiOn && Boolean(row.aiDraft);
  const showAiGap = aiOn && Boolean(row.gapText) && row.kind === "empty";

  return (
    <div className="recon-tl-row">
      <span className="recon-tl-hour">{row.hour}</span>
      <div className={`recon-tl-cell is-${row.kind}`} style={accentStyle(row.signalKind)}>
        {row.kind === "filled" && (
          <>
            <span className="recon-bar" />
            <span className="recon-icon-tile">
              {row.signalKind ? <SignalGlyph kind={row.signalKind} size={15} /> : <GitCommit size={15} />}
            </span>
            <div className="recon-tl-main">
              <div className="recon-tl-headline">
                {row.key && <span className="recon-key">{row.key}</span>}
                <span className="recon-tl-title">{row.title}</span>
              </div>
              <div className="recon-tl-desc">{showAiDraft ? row.aiDraft : row.naiveDescription}</div>
              {showAiDraft && (
                <span className="recon-drafted-tag">
                  <Sparkles size={10} strokeWidth={2} />
                  DRAFTED · {modelShort}
                </span>
              )}
            </div>
            <span className="recon-tl-dur">{formatReconDuration(row.durationMinutes)}</span>
          </>
        )}

        {row.kind === "locked" && (
          <>
            <span className="recon-bar is-locked" />
            <span className="recon-icon-tile is-locked">
              <Lock size={15} strokeWidth={1.9} />
            </span>
            <div className="recon-tl-main">
              <div className="recon-tl-title is-muted">{row.title}</div>
              <div className="recon-tl-sub">{row.sub}</div>
            </div>
            <span className="recon-tl-dur is-jira">in Jira</span>
          </>
        )}

        {row.kind === "empty" && (
          <div className="recon-gap">
            {showAiGap ? (
              <>
                <span className="recon-icon-tile is-ai">
                  <Sparkles size={14} strokeWidth={2} />
                </span>
                <span className="recon-gap-text">{row.gapText}</span>
                <button type="button" className="recon-gap-cta" onClick={onLogTime}>
                  {row.gapCta ?? "Add"}
                </button>
              </>
            ) : (
              <>
                <PlusCircle size={15} strokeWidth={1.8} />
                <span className="recon-gap-text">Gap — no signals. Add an entry by hand.</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
