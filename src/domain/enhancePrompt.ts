import type { ReconstructDay, TimelineRow } from "./reconstruct";

/**
 * Pure prompt-building and response-parsing for the optional local-AI layer.
 *
 * Kept free of any I/O so it can be unit-tested without a running model. The contract is
 * deliberately `ReconstructDay -> ReconstructDay`: if the model is disabled, unreachable,
 * or returns malformed output, {@link parseEnhanceResponse} returns the input day
 * unchanged. The deterministic reconstruction is always the floor.
 */

export const ENHANCE_SYSTEM_PROMPT =
  "You are a senior developer's worklog assistant running locally. You rewrite terse, " +
  "factual development signals (commit subjects, PR titles, review notes) into short, " +
  "clear worklog descriptions a manager could read. One sentence per entry. Never invent " +
  "work that is not implied by the signal. Reply with JSON only — no prose, no code fences.";

const filledRows = (day: ReconstructDay) => day.rows.filter((row) => row.kind === "filled");
const emptyRows = (day: ReconstructDay) => day.rows.filter((row) => row.kind === "empty");

/** Builds the user prompt sent to the model for a single day. */
export const buildEnhancePrompt = (day: ReconstructDay): string => {
  const entries = filledRows(day).map((row) => ({
    hour: row.hour,
    key: row.key,
    signal: row.naiveDescription || row.title,
    minutes: row.durationMinutes
  }));
  const gaps = emptyRows(day).map((row) => ({
    hour: row.hour,
    neighbours: neighbourContext(day, row)
  }));

  return [
    `Reconstruct the worklog for ${day.dateKey}.`,
    "Rewrite each entry's `signal` into one clean worklog sentence (field `draft`).",
    "For each gap, infer in one short sentence what likely happened from the neighbouring entries (field `text`); say so only if plausible.",
    "Respond with exactly this JSON shape:",
    '{"entries":[{"hour":"09:00","draft":"..."}],"gaps":[{"hour":"12:00","text":"..."}]}',
    "",
    "ENTRIES:",
    JSON.stringify(entries),
    "GAPS:",
    JSON.stringify(gaps)
  ].join("\n");
};

const neighbourContext = (day: ReconstructDay, gap: TimelineRow): string => {
  const index = day.rows.indexOf(gap);
  const before = [...day.rows.slice(0, index)].reverse().find((row) => row.kind !== "empty");
  const after = day.rows.slice(index + 1).find((row) => row.kind !== "empty");
  return [before, after]
    .filter((row): row is TimelineRow => Boolean(row))
    .map((row) => `${row.hour} ${row.key} ${row.title}`.trim())
    .join(" → ");
};

interface EnhanceEntry {
  hour: string;
  draft: string;
}

interface EnhanceGap {
  hour: string;
  text: string;
}

/** Extracts the outermost JSON object from a possibly noisy model completion. */
const extractJsonObject = (text: string): unknown => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return undefined;
  }
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return undefined;
  }
};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const readEntries = (value: unknown): EnhanceEntry[] =>
  asArray(value)
    .map((item) => item as Record<string, unknown>)
    .filter((item) => typeof item?.hour === "string" && typeof item?.draft === "string" && item.draft.trim())
    .map((item) => ({ hour: item.hour as string, draft: (item.draft as string).trim() }));

const readGaps = (value: unknown): EnhanceGap[] =>
  asArray(value)
    .map((item) => item as Record<string, unknown>)
    .filter((item) => typeof item?.hour === "string" && typeof item?.text === "string" && item.text.trim())
    .map((item) => ({ hour: item.hour as string, text: (item.text as string).trim() }));

/**
 * Overlays the model's drafts/gap inferences onto the deterministic day. Any parse or
 * shape failure returns the input day unchanged — the core reconstruction is preserved.
 */
export const parseEnhanceResponse = (day: ReconstructDay, responseText: string): ReconstructDay => {
  const parsed = extractJsonObject(responseText);
  if (!parsed || typeof parsed !== "object") {
    return day;
  }

  const record = parsed as Record<string, unknown>;
  const entries = readEntries(record.entries);
  const gaps = readGaps(record.gaps);
  if (entries.length === 0 && gaps.length === 0) {
    return day;
  }

  const draftByHour = new Map(entries.map((entry) => [entry.hour, entry.draft]));
  const gapByHour = new Map(gaps.map((gap) => [gap.hour, gap.text]));

  return {
    ...day,
    rows: day.rows.map((row) => {
      if (row.kind === "filled" && draftByHour.has(row.hour)) {
        return { ...row, aiDraft: draftByHour.get(row.hour) };
      }
      if (row.kind === "empty" && gapByHour.has(row.hour)) {
        return { ...row, gapText: gapByHour.get(row.hour) };
      }
      return row;
    })
  };
};
