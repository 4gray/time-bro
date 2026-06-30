<!-- Authored 2026-06-30. Verified against main via a multi-agent workflow (readers → design+plan → correctness/completeness/scope verifiers → synthesis). All file/symbol references spot-checked against the codebase. -->

# TimeBro — "Yesterday" Standup Recap Card (Sketch 1) — Implementation-Ready Plan

## 1. Overview & locked decisions

The RecapCard is a compact, collapsible summary of the **previous working day** rendered as the first child of the Today view's right rail (`<aside className="today-rail">`), above the existing `TOUCHED TODAY` block. It is strictly **personal standup prep**: a pure read-only "what I did" recap derived entirely from the existing `DayTrackingSummary` (issues, recurringEntries, personalNotes), grouped into the canonical activity model **Tickets → Meetings → Firefighting**. The **deterministic list is the floor** and is always present in the DOM; an optional on-device AI "Polish" overlays 2–3 spoken sentences and **always degrades silently to the list** on any failure. Locked: collapsed-by-default; "Yesterday" = previous *working* day (weekends/skipped days are walked over, never shown); Copy is clipboard-only (not an integration); no persisted recap history (neither the deterministic recap nor AI prose is ever written to storage); no stored plan/blockers, no sharing/posting, no multi-person, no new per-item data capture; no new settings fields (reuse `aiEnabled`/`ollamaEndpoint`/`ollamaModel`); no new design tokens (literal px, neutral hairline border, `font-mono` labels, `var(--ring-*)` category colors).

---

## 2. Data model & flow — resolving the previous working day's `DayTrackingSummary`

Two disjoint resolution paths, merged in `App.tsx` with **in-week preferred, cross-week as fallback**.

### 2a. In-week (today is Tue–Fri) — synchronous, free
`weekState.days` is weekday-ascending, so the previous working day is the last day strictly before today that is configured and not skipped. Extend `buildIssueMetadata` in `useIssueMetadata.ts`:

```ts
const prevDaySummary = weekState.days
  .filter((day) => day.isConfiguredWorkingDay && !day.isSkipped && day.dateKey < todayKey)
  .at(-1);
```

Lexical `dateKey < todayKey` is chronologically valid (zero-padded `YYYY-MM-DD`); `!day.isSkipped` excludes vacation days, matching `activeWorkingDates`. When today is the week's first active working day this filter is empty → `prevDaySummary` is `undefined` → §2b supplies it.

### 2b. Cross-week (Monday → previous Friday) — scoped async load
`reportsWeekStates` is reports-only, so the prior week is not loaded on Today. A new view-gated hook `usePrevWorkingDay` loads it **only** when today is the visible week's first active working day. The Monday-cross-week edge falls out of a plain backward walk in local time (`startOfWeekMonday(addDays(currentDate, -7))`), then taking the prior week's last active working day:

```ts
prevWeek.days.filter((d) => d.isConfiguredWorkingDay && !d.isSkipped).at(-1);
```

Because this filter honors `!isSkipped`, a prior-Friday vacation correctly resolves to Thursday — keeping cross-week semantics aligned with the in-week filter.

### 2c. Merge (in `App.tsx`)
```ts
const recapDaySummary = prevDaySummary ?? prevDayCrossWeek;
```
We pass the **whole `DayTrackingSummary`** (not a prebuilt model) because the recap formatter needs `issues`/`personalNotes`/`recurringEntries`. If both paths yield `undefined`, the card renders its no-prior-day state.

---

## 3. New & changed files

### New files
| File | Purpose |
|------|---------|
| `src/domain/recap.ts` (+ `recap.test.ts`) | Recap model + `buildRecap`/`recapToPlainText`/`recapToMarkdown` + `previousWorkingDayKey` utility. |
| `src/domain/recapPolishPrompt.ts` (+ test) | Pure prompt builder for AI Polish. |
| `src/app/usePrevWorkingDay.ts` (+ test) | Scoped async cross-week prior-day loader. |
| `src/app/useRecapPolish.ts` (+ test) | Graceful AI Polish hook. |
| `src/components/RecapCard.tsx` | The rail card. |
| `src/styles/recap.css` (or appended to `today.css`) | New card CSS. |

### `src/domain/recap.ts` — `previousWorkingDayKey` (test-supporting utility)
Answers *which day* (weekday pattern only); the production data-resolution paths in §2a/§2b additionally honor per-week `isSkipped`. This helper is wired as a tested utility; the two production paths agree with it on weekend-skip semantics and additionally skip vacation days.

```ts
import type { WeekdayNumber } from "../../shared/types";
import { addDays, fromLocalDateKey, isoWeekday, toLocalDateKey } from "../utils/date";
import { normalizeWorkingDays } from "../../shared/weekdays";

export const previousWorkingDayKey = (
  dateKey: string,
  workingDays: WeekdayNumber[],
  maxLookback = 14
): string | null => {
  const days = normalizeWorkingDays(workingDays); // empty -> Mon–Fri fallback
  let cursor = addDays(fromLocalDateKey(dateKey), -1);
  for (let step = 0; step < maxLookback; step += 1) {
    if (days.includes(isoWeekday(cursor) as WeekdayNumber)) return toLocalDateKey(cursor);
    cursor = addDays(cursor, -1);
  }
  return null;
};
```
`isoWeekday(Sat)=6`/`isoWeekday(Sun)=7` are not in default `[1..5]`, so Monday's walk steps over the weekend to Friday. `normalizeWorkingDays` + `maxLookback=14` guard against infinite loops on degenerate `workingDays`.

### `src/app/usePrevWorkingDay.ts` — options must mirror `useReportsHistory`
**Corrected per verifier:** `buildWeekState(weekStart, settings, override, syncResult?, personalNotesOrToday, todayArg, recurringEvents, recurringOccurrences)` (`src/domain/week.ts:52`) requires `settings` (positional arg 2, no default), takes `recurringEvents` (arg 7) **separately** from `recurringOccurrences` (arg 8), and `todayArg` (arg 6) must be passed `currentDate` (never `new Date()`). `DemoScenario` (`src/demo/fixtures.ts`) has **no** `recurringEvents` field — only `recurringOccurrences`; `recurringEvents` comes from App scope (`App.tsx:76`, `useAppRecurringState`).

```ts
export interface UsePrevWorkingDayOptions {
  view: string;                              // gate to "today"
  isBooting: boolean;
  currentDate: Date;                         // from useDemoScenario — never new Date()
  weekState: WeekState;                      // visible week (in-week derivation source)
  settings: AppSettings;                     // REQUIRED: buildWeekState arg 2
  recurringEvents: RecurringEvent[];         // REQUIRED: buildWeekState arg 7 (drives Meetings)
  recurringOccurrences: RecurringOccurrence[];
  demoWeekStart?: Date;
  demoWeekOverride?: WeekOverride;
  demoSyncResult?: SyncResult;
  storage?: MonthStateStorageClient;
  onError: (message: string) => void;
}

export const usePrevWorkingDay = (
  opts: UsePrevWorkingDayOptions
): DayTrackingSummary | undefined => { ... };
```

Behavior, mirroring `useReportsHistory.ts:91–121` exactly:
- **Gate:** load only when `view === "today" && !isBooting` AND the in-week filter (§2a) is empty (today is the week's first active working day). No-op on Tue–Fri.
- `const prevWeekStart = startOfWeekMonday(addDays(currentDate, -7))`.
- **Demo branch** (`prevWeekStart` matches `demoWeekStart`):
  ```ts
  buildWeekState(
    prevWeekStart, settings,
    isDemoWeek ? demoWeekOverride : { weekKey, skippedDates: [] },
    isDemoWeek ? demoSyncResult : undefined,
    [],                                 // personalNotes
    currentDate,                        // todayArg — explicit, no new Date()
    recurringEvents,                    // unconditional (App scope)
    isDemoWeek ? recurringOccurrences : []
  );
  ```
- **Non-demo branch:** `Promise.all` of `storage.getWeekOverride/getSyncResult/getPersonalNotes/getRecurringOccurrences(weekKey)`, then `buildWeekState(prevWeekStart, settings, storedOverride, storedSyncResult, storedPersonalNotes, currentDate, recurringEvents, storedRecurringOccurrences)`.
- Take `prevWeek.days.filter((d) => d.isConfiguredWorkingDay && !d.isSkipped).at(-1)`; set state under an `isMounted` guard; `onError("Unable to load yesterday's recap.")` on throw.
- **Invalidation:** `useEffect` deps include `currentDate`, `view`, `settings`, `recurringEvents`, `recurringOccurrences`, `weekState`, demo fields, `storage`, `onError`. The `isMounted` cleanup must fire on **`currentDate` change** (day rollover across local midnight), not only on `view` change, so a stale prior-day summary is discarded when `useLiveDate` ticks past midnight.
- **No-prior-day:** prior week with no active working day → `undefined` → card's no-prior-day state.

### `src/App.tsx`
- Add `prevDaySummary` to the `useIssueMetadata` destructure (call near `useIssueMetadata(...)`, ~L250; destructure block ~L238–258 — verify before editing).
- `const prevDayCrossWeek = usePrevWorkingDay({ view, isBooting, currentDate, weekState, settings, recurringEvents, recurringOccurrences, demoWeekStart, demoWeekOverride, demoSyncResult, onError });` — `view` (~L47), `recurringEvents`/`recurringOccurrences` (~L76) already in scope.
- `const recapDaySummary = prevDaySummary ?? prevDayCrossWeek;`
- Pass `recapDaySummary={recapDaySummary}` to `<AppMainView>` (opens ~L495; `settings={settings}` ~L508, `weekState={weekState}` ~L511, `recurringEvents={recurringEvents}` ~L536 already passed). **Verify line numbers before editing — they drift.**
- **Extract the merge into a tiny pure helper** `pickRecapDay(inWeek, crossWeek)` (or inline + unit-tested at the App layer) so the precedence — including "both undefined → undefined" — is covered by a test (see §8).

### Threading edits (prop additions per file)
`AppMainViewProps`/`AppTodayRouteProps` use `ComponentProps<typeof child>`, so adding props to `TodayViewProps` auto-propagates the **types** up; only explicit JSX wiring lines are added.

- **`src/components/TodayView.tsx`** — add to `TodayViewProps` and destructure (import `DayTrackingSummary`/`AppSettings`):
  ```ts
  recapDaySummary?: DayTrackingSummary;   // optional — minimizes existing-test churn
  settings: AppSettings;                  // NEW prop: AI Polish gating
  ```
  > Note: `settings` is genuinely **new** on `TodayViewProps`. Grep all render sites of `TodayView` and `AppTodayRoute` and add `settings` to every test harness (see §8); TS will flag omissions but enumerate them rather than relying on "any helper".
- **`src/app/AppTodayRoute.tsx`** — add to `AppTodayRouteProps`, destructure, and pass through:
  ```ts
  recapDaySummary: TodayViewProps["recapDaySummary"];
  settings: TodayViewProps["settings"];
  ```
  JSX: `recapDaySummary={recapDaySummary}` `settings={settings}`.
- **`src/app/AppMainView.tsx`** — in the `view === "today"` branch, forward `recapDaySummary={recapDaySummary}` and `settings={settings}` to `<AppTodayRoute>` (`settings` already threaded into `AppMainView`).

---

## 4. Deterministic recap formatter — `src/domain/recap.ts`

Pure, I/O-free, unit-testable. Reads only from `DayTrackingSummary`. **Stores raw seconds only** — all unit conversion happens once each, at the formatter boundary (the named seconds/hours/minutes risk).

### Model
```ts
import type { DayTrackingSummary } from "../../shared/types";
import { ACTIVITY_CATEGORIES, dayActivitySeconds, type ActivityKey } from "./activity";

export interface RecapLine {
  key?: string;        // ticket issue key; absent for meeting/fire
  summary: string;     // display text (see field precedence below)
  seconds: number;     // raw seconds — formatters convert at the edge
}

export interface RecapGroup {
  key: ActivityKey;    // "ticket" | "meeting" | "fire"
  label: string;       // ACTIVITY_CATEGORIES label
  color: string;       // var(--ring-*)
  seconds: number;     // category total (from dayActivitySeconds — source of truth)
  lines: RecapLine[];  // descending by seconds, ties: key asc / summary asc
}

export interface RecapModel {
  dateKey: string;
  weekdayLabel: string;   // full weekday e.g. "Friday" — carried so empty/header strings agree
  shortDateLabel: string; // formatShortDate -> "Jun 27"
  totalSeconds: number;
  groups: RecapGroup[];   // canonical order; UI omits groups with seconds === 0
  isEmpty: boolean;       // totalSeconds === 0
}

export const buildRecap = (day: DayTrackingSummary): RecapModel => { ... };
export const recapToPlainText = (model: RecapModel): string => { ... };
export const recapToMarkdown = (model: RecapModel): string => { ... };
```

**`buildRecap(day)`:**
- `const seconds = dayActivitySeconds(day)` → `{ ticket, meeting, fire }`. **Group totals use these values** — the source of truth.
- Line construction must use the **same predicate** as `dayActivitySeconds` so totals and rendered lines never disagree:
  - **ticket:** `day.issues` → `{ key, summary: issue.summary, seconds: issue.loggedSeconds }`.
  - **meeting:** `day.recurringEntries` (`{ summary: entry.title, seconds: entry.timeSpentSeconds }`) + `day.personalNotes.filter((n) => n.category === "meeting")`.
  - **fire:** `day.personalNotes.filter((n) => n.category !== "meeting")` — **note `dayActivitySeconds` treats undefined `category` as fire**, so use the exact `!== "meeting"` predicate.
- **PersonalNote summary field precedence:** `note.title ?? note.text` (`PersonalNote.text` is required; `title` optional — there is no `summary` field). Collapse whitespace/newlines to a single line for display.
- `weekdayLabel = WEEKDAY_LABELS[isoWeekday(...) - 1]` (full name "Friday"); `shortDateLabel = formatShortDate(date)` ("Jun 27").
- `totalSeconds = ticket + meeting + fire`; `isEmpty = totalSeconds === 0`.

**Duration formatter lock (resolves the open decision):**
- **On-screen item rows:** `formatReconDuration(seconds / 60)` (minutes) — echoes the reconstruct one-liner cadence; `{ estimate: true }` → `~40m` for inferred entries.
- **Group/header totals:** `formatDuration(seconds / 3600)` (hours) — drops `0m`, so `1h` not `1h 00m`.
- **Copy text (plain + markdown):** `formatDuration(seconds / 3600)` per §6.3 read-aloud cadence.
A `recap.test.ts` parity test asserts the line-count split equals the `dayActivitySeconds` split, and asserts each unit conversion.

**`recapToPlainText(model)`** (Copy default + AI Polish input):
```
Yesterday (Fri 27 Jun) — 7h 30m tracked.

Tickets (4h 30m):
• PROJ-412 Refactor auth guard — 2h 10m
• PROJ-408 Fix token refresh race — 1h 20m
• PROJ-419 Review queue triage — 1h

Meetings (2h):
• Sprint planning — 1h
• 1:1 with Dana — 1h

Firefighting (1h):
• Prod alert — payment webhook — 1h
```
Header: `Yesterday ({SHORT_WEEKDAY} {shortDateLabel}) — {formatDuration(total)} tracked.`; blank line between header and groups and between groups; group line `{label} ({formatDuration(groupHours)}):`; item `• {key} {summary} — {dur}` (omit `{key} ` when absent). **Copy includes ALL items**, ignoring the on-screen 4-item cap. Empty case (single line, weekday from `weekdayLabel` so it agrees with the empty-note): `Yesterday (Fri 27 Jun) — nothing tracked.`

**`recapToMarkdown(model)`** (Alt/Option-click): same structure, keys in backticks, group totals after `·`, `- ` bullets. Both builders are pure functions over the same `RecapModel`. Per the scope guardrail: these are **destination-agnostic clipboard strings** — no Slack/Jira presets, no "post to…" affordance, no UI string advertising them "for posting".

---

## 5. AI Polish — graceful degradation over the verified Ollama client

Purely additive; the deterministic list is always in the DOM. Reuses the verified Ollama client: `probeOllama` + `OllamaConnection` are exported from `src/api/ollama.ts`, and text generation goes through `nativeApi.generateWithOllama` (from `src/api/native.ts`) exactly as `computeAiDrafts` does at `ollama.ts:68` ( `OllamaGenerateRequest{endpoint,model,prompt,system?,format?}` / `OllamaGenerateResult{ok,response?,message?}`).

### `src/domain/recapPolishPrompt.ts`
```ts
export const RECAP_POLISH_SYSTEM_PROMPT =
  "You are a standup assistant running locally. Rewrite the factual list of " +
  "yesterday's work into 2-3 natural spoken sentences for a standup update. " +
  "Never invent work or add details not present. Reply with prose only — no lists, no markdown.";

export const buildRecapPolishPrompt = (recapText: string): string =>
  [
    "Here is what I did yesterday (factual list):",
    "",
    recapText,
    "",
    "Rewrite it as 2-3 spoken sentences I can say in standup."
  ].join("\n");
```
No `format` field (prose, not JSON); no parser — the trimmed response is the result.

### `src/api/ollama.ts` — `polishRecap` facade (mirrors `computeAiDrafts`)
```ts
export const polishRecap = async (
  recapText: string,
  connection: OllamaConnection
): Promise<string> => {
  if (!recapText.trim()) return recapText;
  try {
    const result = await nativeApi.generateWithOllama({
      endpoint: connection.endpoint,
      model: connection.model,
      system: RECAP_POLISH_SYSTEM_PROMPT,
      prompt: buildRecapPolishPrompt(recapText)
      // NO format → prose
    });
    if (!result.ok || !result.response) return recapText; // degrade
    return result.response.trim();
  } catch {
    return recapText;
  }
};
```
**Degradation contract:** every failure path — bridge missing, `ok:false`, empty `response`, throw, 60s-timeout-as-`ok:false` — returns the deterministic `recapText` unchanged. AI is never required and never sends data off-device.

### `src/app/useRecapPolish.ts`
There is **no existing `aiOn` symbol** to import; the composite is assembled here exactly like `useReconstruct` (early-return on `!settings.aiEnabled`, then `probeOllama` → `reachable && modelReady`).
```ts
export interface UseRecapPolishOptions { recapText: string; settings: AppSettings; }
export interface RecapPolishState {
  aiOn: boolean;          // settings.aiEnabled && reachable && modelReady
  polished?: string;      // overlay; undefined → show deterministic
  isPolishing: boolean;
  polish: () => void;
  aiModel: string;
}
```
- `aiConnection = useMemo(() => ({ endpoint: settings.ollamaEndpoint, model: settings.ollamaModel }), [...])`.
- **Probe once in an effect** (matching `useReconstruct`, not per-click) to set reachability; `aiOn` gates render of the Polish button. Avoids a probe round-trip on every click.
- `polish()`: guarded by `isPolishing` (button `disabled` while in flight — the actual guard, not just runId); calls `polishRecap`; a `polishRunId` ref invalidates stale runs.
- **Reset `polished` to `undefined` whenever `recapText` changes** — and `recapText` changes whenever the resolved day changes (day rollover, in-week↔cross-week swap), so prose never bleeds across days.
- **In-memory only** — `polished` is never written to storage or cached keyed by `dateKey` (no back-door recap history).

---

## 6. Component & CSS — `src/components/RecapCard.tsx`

**Props:** `{ daySummary?: DayTrackingSummary; settings: AppSettings; }`. Builds `model = useMemo(() => daySummary ? buildRecap(daySummary) : null, [daySummary])`, `deterministicText = model ? recapToPlainText(model) : ""`, feeds `useRecapPolish({ recapText: deterministicText, settings })`. Disclosure uses the **dock pattern** (state-toggled `<button>` + Lucide `ChevronDown`/`ChevronUp`, `useState` for `open`) — **not** native `<details>`.

### 6.1 Placement & shell
First child of `<aside className="today-rail">` in `TodayView.tsx` (~L502), **above** the `rail-label "TOUCHED TODAY"` block (~L503). `.recap-card` clones `.reminder-card` but **neutral** (drop the amber tint; amber is reserved for Reminder): `padding:14px 16px; border:1px solid var(--border); border-radius:10px; background:none;`. As the first rail child it has **no top margin**; its **bottom margin must give breathing room before the next `rail-label`** — `margin:0 0 12px` (the 4px draft is too tight against the borderless `TOUCHED` label).

### 6.2 Collapsed bar (default)
One flex row, the disclosure trigger: eyebrow+date, spacer, mini ring, total, chevron.
```
YESTERDAY · Fri 27 Jun            ◓  7h30m   ⌄
```
- `.recap-eyebrow` — `.rail-label` idiom (`font-mono` 11px, letter-spacing 0.16em, `var(--dim-2)`); UPPERCASE in JSX (`YESTERDAY · FRI · JUN 27`); date segment after `·` in `var(--dim)`.
- Mini `<DayRing size={22} stroke={3} gapDegrees={2} rounded={false}>` **no center child**.
- `.recap-total` — `font-mono` 12px `var(--text-strong)` wt 500 (`7h30m` compressed on the bar; `7h 30m` inside body).
- `.recap-chevron` — `var(--dim-2)`; `:hover` via `.recap-bar:hover .recap-chevron { color: var(--dim); }`; flips to `ChevronUp` when open.
- `.recap-bar` — `width:100%; display:flex; align-items:center; gap:10px; background:none; border:0; padding:0; cursor:pointer; text-align:left;`.

### 6.3 Expanded body
Chevron flips up; `.recap-body` unfolds with `margin-top:12px` and a top hairline (`1px var(--line)`). Renders the header ring **in place** (no second body ring — restraint). Then per non-empty group (canonical order, `seconds > 0` only):
- `.recap-group-head` (flex baseline, `gap:7px`, `margin-top:14px`): `.recap-group-dot` (clone of `.ring-legend-dot`, 9×9, `border-radius:3px` rounded square, `flex:none`, **inline** `style={{ background: category.color }}` from `ACTIVITY_CATEGORIES[i].color`), `.recap-group-name` (`font-mono` 11.5px `var(--text-strong)`), `.recap-group-total` (`margin-left:auto`, `font-mono` 11.5px `var(--dim)`).
- `.recap-item` rows (flex baseline, `gap:8px`, `padding:3px 0 3px 16px`, `font-mono` 12px): `.recap-item-key` (`var(--dim)` 11px, `flex:none`), `.recap-item-summary` (`flex:1 1 auto; min-width:0; var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;` + `title={summary}`), `.recap-item-dur` (`var(--text-strong)` 11px, `flex:none`). Item dur via `formatReconDuration`.
- **Overflow:** cap each group at **4 visible items** (cap is by count, **width-independent**); remainder collapses into `.recap-more` (`var(--dim-2)` 11px, 16px indent): `+ {n} more · {formatDuration(remainderHours)}`. Static rollup, not a control in v1; full breakdown always recoverable via Copy.

### 6.4 Action row, Copy, Polish
`.recap-actions` (flex, `gap:8px`, `margin-top:14px`, `padding-top:12px`, top `1px var(--line)`) with `.recap-spacer { flex:1 }` pushing Polish right. Both `.recap-btn`: `font-mono` 11px, `border-radius:7px`, `1px var(--line)`, `var(--dim)`; `:hover` → `var(--text-strong)`/`var(--border)`.

**Copy** (Lucide `Copy`): copies `deterministicText` always (independent of Polish state); Alt/Option-click copies `recapToMarkdown`. Clipboard handling — **there is no existing clipboard usage in `src/` to model from, so specify it fully**:
```ts
const copy = async (markdown: boolean) => {
  const text = markdown ? recapToMarkdown(model) : deterministicText;
  try {
    await navigator.clipboard.writeText(text);     // renderer is secure context (Electron)
    setCopied(markdown ? "md" : "plain");          // COPIED ✓ / COPIED MD ✓ for 1.6s
    setTimeout(() => setCopied(null), 1600);
  } catch {
    // do NOT flash "Copied" on rejection; leave label unchanged.
    // (Optional fallback: Electron clipboard via preload bridge — out of v1 scope.)
  }
};
```
On success only: label swaps to `COPIED ✓` (`var(--green)`), icon `Copy`→`Check`, reverts after 1.6s; the polite live region announces `Copied`. The `await`-then-set ordering guarantees the success affordance never fires on a rejected write (focus loss / non-secure context).

**Polish** (`.recap-btn`, Lucide `Sparkles`, right-aligned) **only renders when `aiOn`** (`settings.aiEnabled && reachable && modelReady`) — no disabled stub, no nag when AI is off/unreachable.
- **(a) idle:** `✦ Polish`; list shown below.
- **(b) polishing:** `⟳ Polishing…`, `Loader2` with `.recap-spinner` (`@keyframes recap-spin`), button `disabled` + `aria-busy`; **list stays fully visible underneath**.
- **(c) polished:** `.recap-prose` (the one **sans** moment: `font-sans` 12.5px `var(--muted)` line-height 1.5, `margin-top:12px`) appears **above** the list; the list collapses to a `Show list ⌄` affordance. `.recap-prose-meta` (`font-mono` 10.5px `var(--dim-2)`): `✦ Polished on-device by {aiModel} · Show list`, with `.recap-show-list` inline toggle (dotted-underline, `var(--dim)` → `var(--text-strong)`). Polish button becomes a stateful toggle `Polished ✓` (`var(--green)`); re-click discards prose → idle+list. Two routes back: inline `Show list` (keeps prose, reveals facts below) or re-click Polish (discards prose).
- **(d) failed → silent fallback:** on `!ok` / empty / throw, button returns to **idle**, list unchanged. No toast, no red text. (Optional lowest-key `title` on the button.) Copy always emits the deterministic list regardless of lens.

### 6.5 Empty & edge states
- **No tracked work** (`daySummary` exists, all categories 0): collapsed total `0h`, empty ring track; expanded body shows a single `.empty-note` (`font-mono` 12px `var(--dim-2)`, `padding:14px 0`) `Nothing tracked Friday.` (weekday from `model.weekdayLabel`). **Action row hidden** (nothing to copy; no Polish).
- **Data not yet synced** (cross-week load in flight, Monday only): static dim placeholder bar `YESTERDAY · —` (`var(--dim-2)`, no shimmer); not clickable; resolves when `usePrevWorkingDay` completes.
- **No prior working day** (`daySummary` undefined after both paths): collapsed-only, non-interactive `.empty-note` bar `YESTERDAY · no prior working day`, no chevron.
- **Day-rollover:** when `currentDate` crosses midnight, `recapDaySummary` re-resolves; in-flight cross-week load is invalidated (§3), `polished` resets (§5), and `open` state may reset.

### 6.6 Mini DayRing
```jsx
const segments = activitySegments(dayActivitySeconds(daySummary));
const nonEmptyGroupCount = model ? model.groups.filter((g) => g.seconds > 0).length : 0;
<DayRing
  segments={segments}
  targetHours={daySummary.targetHours}
  size={22} stroke={3} gapDegrees={2} rounded={false}
  trackColor="var(--line)"
  ariaLabel={
    model && model.totalSeconds > 0
      ? `Yesterday: ${formatDuration(daySummary.trackedHours)} tracked across ${nonEmptyGroupCount} categories`
      : `Yesterday: 0h tracked`
  }
/>
```
**Single ring only** (size 22, header) — resolving the spec/plan size disagreement in favor of the restrained header-ring; no larger body ring. Segment colors come from `ACTIVITY_CATEGORIES` via `activitySegments` (already `var(--ring-*)`); legend dots read the same tokens so arc and dots never desync across themes. Empty day passes all-zero segments → empty `var(--line)` track (no special-casing).

### 6.7 CSS home & responsive
New CSS in `src/styles/recap.css` (or appended to `today.css` near `.reminder-card`). Reused verbatim: `.today-rail`, `.rail-label`, `.empty-note` (reports.css), `.ring-legend*` (rings.css), `DayRing`'s `.day-ring*`. **Responsive:** no new media query — `.recap-actions`, `.recap-group-head`, item rows are all flex and reflow inside the `width:auto` rail at `<=1100px`; `.recap-spacer` still separates Copy/Polish (flex spacer scales). The 4-item cap is **width-independent** (by count). Verify the full-width form at a narrow window manually (§9) — it is not test-gated.

### 6.8 Accessibility
- **Disclosure:** `.recap-bar` is `<button type="button" aria-expanded={open} aria-controls="recap-body">`; body is `<div id="recap-body" role="region" aria-labelledby="recap-bar-label">`. Chevrons `aria-hidden`. Provide an `aria-label` spelling the duration in words: `Yesterday, Friday 27 June, 7 hours 30 minutes tracked`.
- **Ring:** `ariaLabel` as above (redundant with text total); SVG `role="img"`.
- **Copy:** `aria-label="Copy yesterday's recap to clipboard"`; success sets `<span role="status" aria-live="polite">` → `Copied`; `Check` icon `aria-hidden`.
- **Polish:** `aria-pressed={polished}`, `aria-label="Polish recap into spoken sentences"`; `aria-busy` + `disabled` while polishing; on success announce `Recap polished`; on silent failure prefer silence. Prose block `role="region" aria-label="Polished recap"`; `Show list` is a `<button aria-expanded>` controlling the list region.
- **Invariant:** the deterministic list is always in the DOM (visually collapsed when polished) → SR users always have the facts.
- **Contrast/focus:** `--text-strong`/`--muted` on `--bg` for figures/body; `--dim-2` only for non-essential mono labels; `--green` paired with icon+text (never color-alone). `.recap-bar`/`.recap-btn`/`.recap-show-list` keep the app's existing focus-visible outline (do not suppress).

---

## 7. Edge cases

| Case | Trigger | Behavior |
|------|---------|----------|
| In-week prior day | Today Tue–Fri | Synchronous `prevDaySummary` from `weekState.days.filter(...).at(-1)`. |
| Monday cross-week | Today is week's first active working day | `usePrevWorkingDay` loads prior week, takes last active working day (prev Friday). |
| Prior Friday was vacation | Cross-week, last working day `isSkipped` | `!isSkipped` filter resolves to Thursday (helper + data paths agree). |
| Weekend / holiday "yesterday" | n/a | Never shown — backward working-day walk skips it. |
| No tracked work | `daySummary` exists, all categories 0 | `isEmpty:true`; `0h` + empty ring; `.empty-note` "Nothing tracked Friday."; action row hidden. |
| Cross-week loading | Async build in flight (Monday only) | Static dim `YESTERDAY · —` placeholder, not clickable. |
| No prior working day | Both paths `undefined` (degenerate `workingDays` / first-ever week) | Collapsed-only non-interactive `.empty-note` "no prior working day", no chevron. |
| Day rollover across midnight | `useLiveDate` ticks `currentDate` | Re-resolve `recapDaySummary`; invalidate in-flight cross-week load; reset `polished`. |
| Empty `workingDays` | Degenerate config | `normalizeWorkingDays` → Mon–Fri fallback; `maxLookback=14` prevents loop. |
| AI off / unreachable | `!aiEnabled` or probe fails | Polish button absent; list only. |
| AI call fails | `!ok` / empty / throw / timeout | `polishRecap` returns deterministic text; button silently returns to idle. |
| Clipboard rejects | Focus loss / non-secure context | `try/catch`; no "Copied" flash; label unchanged. |
| Sub-hour durations | e.g. 45m | On-screen `formatReconDuration(s/60)`; totals/copy `formatDuration(s/3600)`. |
| Undefined note category | `note.category` absent | Treated as **fire** (`!== "meeting"`), matching `dayActivitySeconds`. |

---

## 8. Tests

**`src/domain/recap.test.ts`** (new):
- `previousWorkingDayKey`: Tue→Mon (in-week); **Monday→previous Friday** (default `[1..5]`); custom pattern (`workingDays=[1,3,5]` → Wed's prev is Mon); empty `workingDays` → Mon–Fri fallback, no infinite loop; no prior day within `maxLookback` (`workingDays=[7]`, `maxLookback=3`) → `null`.
- `buildRecap`: ticket/meeting/fire grouping from `issues`/`recurringEntries`/`personalNotes` (meeting vs non-meeting split, undefined category → fire); **parity test** — line-count split equals `dayActivitySeconds` split; PersonalNote `title ?? text` precedence + whitespace collapse; empty summary → `isEmpty:true`, `totalSeconds:0`; cross-week empty-build summary (`trackedHours:0`) → empty state, no crash; descending-by-seconds ordering with tie-break.
- `recapToPlainText`/`recapToMarkdown`: exact output for a populated model and the empty model (weekday string agrees across header/empty-note); unit-conversion assertions for each formatter.

**`src/domain/recapPolishPrompt.test.ts`** (new): `buildRecapPolishPrompt` includes the recap text and joins with `\n`; `RECAP_POLISH_SYSTEM_PROMPT` instructs prose-only.

**`src/api/ollama.ts` polish facade** (extend existing ollama test style, else add `ollama.test.ts`): mock `nativeApi.generateWithOllama` returning `{ok:false}`, `{ok:true,response:""}`, throw, and `{ok:true,response:"…"}`; assert degradation to deterministic text on **every** failure path and overlay (trimmed) on success.

**`src/app/useRecapPolish.test.tsx`** (new): `aiOn` false when `aiEnabled:false`; deterministic passthrough; `isPolishing` toggles + button-disabled guard; stale-run invalidation via runId; `polished` resets when `recapText` changes.

**`src/app/usePrevWorkingDay.test.tsx`** (new, model on `useMonthState.test.tsx`/`useReportsHistory` patterns): in-week / Tue–Fri → no load; first-working-day → loads prior week (demo + non-demo branches) passing `settings`/`recurringEvents`/`currentDate`-as-`todayArg`; empty prior week → `undefined`; in-flight load invalidated on `currentDate` change.

**App-layer merge** (new — the integration seam, per verifier): unit-test `pickRecapDay`/the precedence: in-week present → in-week chosen; in-week undefined + cross-week present → cross-week; both undefined → `undefined`. Guards against cross-week firing on Tue–Fri or an off-by-one day pick.

**Existing route tests to update** (enumerate all `TodayView`/`AppTodayRoute` render sites — `settings` is a new required prop):
- `src/app/AppTodayRoute.test.tsx` — add `recapDaySummary` (optional) + `settings` to the harness; assert RecapCard renders / collapsed summary present.
- `src/app/AppMainView.test.tsx` — supply the new props if it renders the today branch.
- Any other `TodayView` render helper surfaced by grep — add `settings` (and `recapDaySummary` is optional to minimize churn).

---

## 9. Demo verification

Release fixtures (`seed=release`) seed the **week of 2026-06-15** (Mon 06-15, Tue 06-16, Wed 06-17, with worklogs also on Thursday `thursdayKey` and `fridayKey` referenced); the **prior week (2026-06-08) is unseeded**. Default `today` is `2026-06-17`. URLs: `?demo=1&view=today&seed=release&today=YYYY-MM-DD`.

| URL | Yesterday resolves to | Path | Expected |
|-----|----------------------|------|----------|
| `…&today=2026-06-17` | Tue 2026-06-16 | in-week (sync) | Tue's tickets/meetings/firefighting grouped; mini ring matches that day's split; non-zero legend dots; Copy present. |
| `…&today=2026-06-16` | Mon 2026-06-15 | in-week (sync) | Mon's grouped recap. |
| `…&today=2026-06-15` (**Monday edge**) | Fri 2026-06-12 (prior week) | cross-week (async) | Monday is week's first working day → in-week filter empty → `usePrevWorkingDay` builds prior week (2026-06-08 start) with **empty data** → Fri summary `trackedHours:0` → renders **empty state** "Nothing tracked Friday." gracefully (proves cross-week load + empty-week handling, no crash). |

> **Caveat for reviewers:** the only demo-able Monday-edge scenario shows an **empty** card because no prior week is seeded — it exercises the cross-week plumbing and empty handling but does **not** visually prove a *populated* cross-week recap. A populated Monday recap is covered by `usePrevWorkingDay.test.tsx` only (or add a second seeded prior week to the release fixtures if a visual demo is required). Do not mistake the empty card for a broken feature.

**AI Polish:** with `aiEnabled:false` (default) the Polish button is hidden and the deterministic list shows. To verify Polish, enable AI in settings with a reachable Ollama: the button appears, spinner shows, prose overlays with the on-device disclosure; turning AI off or killing Ollama falls back to the list. **Responsive:** manually narrow the window below 1100px and confirm the rail goes full-width with Copy/Polish still separated.

---

## 10. Phased build checklist (smallest shippable first)

**Phase 1 — deterministic core (ships a working recap for Tue–Fri):**
1. `src/domain/recap.ts` (`previousWorkingDayKey`, `buildRecap`, `recapToPlainText`, `recapToMarkdown`) + `recap.test.ts`.
2. In-week `prevDaySummary` in `useIssueMetadata.ts` (interface + body filter + return).
3. `RecapCard.tsx` (collapsed/expanded, ring + legend + Copy with try/catch, empty state) + CSS.
4. Thread `recapDaySummary` (optional) + `settings` through `App.tsx` → `AppMainView` → `AppTodayRoute` → `TodayView`; render in the rail.
5. Update `AppTodayRoute.test.tsx` / `AppMainView.test.tsx` + any other `TodayView` render harness; App-layer merge test.

**Phase 2 — cross-week (Monday edge):**
6. `usePrevWorkingDay.ts` (mirroring `useReportsHistory` options/`buildWeekState` args) + test; merge `prevDaySummary ?? prevDayCrossWeek` in `App.tsx`.

**Phase 3 — AI Polish (optional overlay):**
7. `recapPolishPrompt.ts` + test; `polishRecap` in `ollama.ts` + test; `useRecapPolish.ts` + test; wire Polish button + disclosure in `RecapCard`.

---

## 11. Scope guardrails (locked)

- **PURE "what I did"** — Tickets/Meetings/Firefighting only, derived from existing `DayTrackingSummary` data. **No new per-item field** (no blocker/plan tag) to enrich lines.
- **No stored plan/blockers; no forward-looking fields.**
- **No persisted recap history** — `recap.ts` is pure; hooks only read; **neither the deterministic recap nor AI prose is ever written to storage or cached keyed by `dateKey`**. `polished` is strictly in-memory.
- **No sharing/posting integrations** — Copy (plain + markdown) is **clipboard-only**, destination-agnostic; no Slack/Jira presets, no "post to…" affordance, no UI string advertising the markdown variant "for posting".
- **No multi-person** — single-user, own data.
- **"Yesterday" = previous *working* day** — never weekend/skipped.
- **AI Polish always degrades to the deterministic list** — gated on `settings.aiEnabled`, on-device Ollama only, never required, never sends data off-device.
- **RecapCard collapsed-by-default**, Today right rail, first child above "Touched today".
- **No new settings fields** (`aiEnabled`/`ollamaEndpoint`/`ollamaModel` reused); **no new design tokens** (literal px, neutral `var(--border)` hairline, `font-mono` labels, `var(--ring-*)` colors via inline style — never hex).

---

**Key files (absolute):**
- New: `/Users/fourgray/Code/big-bro/src/domain/recap.ts` (+ `recap.test.ts`), `/Users/fourgray/Code/big-bro/src/domain/recapPolishPrompt.ts` (+ test), `/Users/fourgray/Code/big-bro/src/app/usePrevWorkingDay.ts` (+ test), `/Users/fourgray/Code/big-bro/src/app/useRecapPolish.ts` (+ test), `/Users/fourgray/Code/big-bro/src/components/RecapCard.tsx`, `/Users/fourgray/Code/big-bro/src/styles/recap.css`
- Edit: `/Users/fourgray/Code/big-bro/src/app/useIssueMetadata.ts`, `/Users/fourgray/Code/big-bro/src/api/ollama.ts`, `/Users/fourgray/Code/big-bro/src/App.tsx`, `/Users/fourgray/Code/big-bro/src/app/AppMainView.tsx`, `/Users/fourgray/Code/big-bro/src/app/AppTodayRoute.tsx`, `/Users/fourgray/Code/big-bro/src/components/TodayView.tsx`, `/Users/fourgray/Code/big-bro/src/styles/today.css` (if not using a new recap.css), `/Users/fourgray/Code/big-bro/src/app/AppTodayRoute.test.tsx`, `/Users/fourgray/Code/big-bro/src/app/AppMainView.test.tsx`
- Reference (mirror, do not duplicate): `/Users/fourgray/Code/big-bro/src/app/useReportsHistory.ts`, `/Users/fourgray/Code/big-bro/src/domain/week.ts` (`buildWeekState`), `/Users/fourgray/Code/big-bro/src/app/useReconstruct.ts` (probe-in-effect pattern)
- Optional export only if a recap line reuses the exact wording: `/Users/fourgray/Code/big-bro/src/domain/reconstruct.ts` (`naivePrDescription`, `naiveCommitDescription`)