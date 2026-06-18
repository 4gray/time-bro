import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  LockKeyhole,
  Loader2,
  Save,
  ShieldCheck,
  TestTube2
} from "lucide-react";
import type { AppSettings, JiraConnectionResult, WeekdayNumber } from "../../shared/types";

interface SettingsViewProps {
  draft: AppSettings;
  onDraftChange: (settings: AppSettings) => void;
  onSave: () => void;
  onTestConnection: () => void;
  isTesting: boolean;
  testResult?: JiraConnectionResult;
  savedMessage?: string;
}

const WEEKDAYS: Array<{ value: WeekdayNumber; label: string }> = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" }
];

const API_TOKEN_URL = "https://id.atlassian.com/manage-profile/security/api-tokens";

export const SettingsView = ({
  draft,
  onDraftChange,
  onSave,
  onTestConnection,
  isTesting,
  testResult,
  savedMessage
}: SettingsViewProps) => {
  const updateField = <Key extends keyof AppSettings>(key: Key, value: AppSettings[Key]) => {
    onDraftChange({
      ...draft,
      [key]: value
    });
  };

  const toggleWorkingDay = (day: WeekdayNumber) => {
    const workingDays = draft.workingDays.includes(day)
      ? draft.workingDays.filter((candidate) => candidate !== day)
      : [...draft.workingDays, day].sort();

    updateField("workingDays", workingDays as WeekdayNumber[]);
  };

  return (
    <main className="content-shell settings-shell">
      <header className="command-bar">
        <div>
          <h1>Settings</h1>
          <p>Connect Jira, set weekly expectations, and schedule local reminders.</p>
        </div>

        <button className="primary-button" type="button" onClick={onSave}>
          <Save size={17} />
          Save settings
        </button>
      </header>

      {savedMessage && <div className="status-callout success">{savedMessage}</div>}

      <section className="settings-grid">
        <form className="settings-panel" onSubmit={(event) => event.preventDefault()}>
          <div className="section-title">
            <ShieldCheck size={18} />
            <span>Jira Cloud sign-in</span>
          </div>

          <div className="auth-primer">
            <div className="auth-primer-icon">
              <KeyRound size={18} />
            </div>
            <div>
              <strong>No Jira admin needed</strong>
              <p>
                Use your normal developer account plus a regular Atlassian API token. The app can only read worklogs
                your user is already allowed to see.
              </p>
            </div>
          </div>

          <label>
            <span>Jira site</span>
            <input
              type="text"
              placeholder="mycompany or mycompany.atlassian.net"
              value={draft.jiraBaseUrl}
              onChange={(event) => updateField("jiraBaseUrl", event.target.value)}
            />
            <small className="field-hint">Pasting the full URL also works.</small>
          </label>

          <label>
            <span>Jira email</span>
            <input
              type="email"
              placeholder="you@company.com"
              value={draft.jiraEmail}
              onChange={(event) => updateField("jiraEmail", event.target.value)}
            />
          </label>

          <label>
            <span>Jira API token</span>
            <input
              type="password"
              placeholder="Paste a token from your Atlassian account"
              value={draft.jiraApiToken}
              onChange={(event) => updateField("jiraApiToken", event.target.value)}
            />
            <small className="field-hint">
              Use a regular token for this MVP. Scoped-token support would need read:jira-work and read:jira-user via
              Atlassian's gateway.
            </small>
          </label>

          <div className="privacy-promise">
            <LockKeyhole size={17} />
            <p>Credentials stay in IndexedDB and are sent only to your Jira Cloud site during test or sync.</p>
          </div>

          <div className="inline-actions">
            <a className="secondary-button" href={API_TOKEN_URL} target="_blank" rel="noreferrer">
              <ExternalLink size={16} />
              Create API token
            </a>
            <button className="secondary-button" type="button" onClick={onTestConnection} disabled={isTesting}>
              {isTesting ? <Loader2 className="spin" size={16} /> : <TestTube2 size={16} />}
              Test Jira connection
            </button>
          </div>

          {testResult && (
            <div className={`status-callout compact ${testResult.ok ? "success" : "error"}`}>
              {testResult.ok && <CheckCircle2 size={16} />}
              <span>{testResult.message}</span>
            </div>
          )}
        </form>

        <div className="settings-panel">
          <div className="section-title">
            <CalendarDays size={18} />
            <span>Weekly target</span>
          </div>

          <label>
            <span>Target hours</span>
            <input
              type="number"
              min="1"
              max="80"
              step="0.5"
              value={draft.weeklyTargetHours}
              onChange={(event) => updateField("weeklyTargetHours", Number(event.target.value))}
            />
          </label>

          <div className="field-group">
            <span>Working days</span>
            <div className="weekday-selector">
              {WEEKDAYS.map((day) => (
                <button
                  className={draft.workingDays.includes(day.value) ? "active" : ""}
                  key={day.value}
                  type="button"
                  onClick={() => toggleWorkingDay(day.value)}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="settings-panel">
          <div className="section-title">
            <Bell size={18} />
            <span>Reminder</span>
          </div>

          <label className="switch-row">
            <span>
              <strong>Daily reminder</strong>
              <small>Skip vacation days and completed weeks.</small>
            </span>
            <button
              className={`switch ${draft.remindersEnabled ? "on" : ""}`}
              type="button"
              aria-pressed={draft.remindersEnabled}
              onClick={() => updateField("remindersEnabled", !draft.remindersEnabled)}
            >
              <span />
            </button>
          </label>

          <label>
            <span>Reminder time</span>
            <input
              type="time"
              value={draft.reminderTime}
              onChange={(event) => updateField("reminderTime", event.target.value)}
            />
          </label>
        </div>
      </section>
    </main>
  );
};
