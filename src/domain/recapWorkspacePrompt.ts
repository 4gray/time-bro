import type {
  RecapCopyLine,
  RecapCopyParagraph,
  RecapDetail,
  RecapDraftVersion,
  RecapFormat,
  RecapTheme
} from "../../shared/types";
import { recapNarrativeCopy, recapSourceRef } from "./recapWorkspace";

export const RECAP_WORKSPACE_SYSTEM_PROMPT = [
  "You are an evidence editor for a developer's private work journal.",
  "Turn real activity into clear review-ready writing without inventing impact, completion, ownership, numbers, scope, or sources.",
  "Do not say shipped, delivered, fixed, improved, led, or owned unless the supplied evidence explicitly supports that claim.",
  "Separate recorded work from business outcomes. If an outcome is missing, say so through needsImpact instead of making one up.",
  "Treat USER CLAIMS as trusted personal evidence. Preserve them exactly as separate userImpact data and never invent or weaken them.",
  "When returning theme blocks, preserve every supplied theme id. Cite only allowed refs. Return JSON only."
].join(" ");

const FORMAT_INSTRUCTIONS: Record<RecapFormat, string[]> = {
  perf: [
    "Write one performance-review document for the person doing the work.",
    "Use a factual lead and connected paragraphs rather than workstream headings or a ticket-by-ticket list.",
    "Explain scope, contribution, collaboration, and recorded outcomes only when evidence supports them.",
    "Lines are optional evidence highlights, not the main document."
  ],
  manager: [
    "Write a plain first-person manager update.",
    "Write one connected report that explains where time and attention went.",
    "The report must read naturally without Jira epic headings or a source-by-source list."
  ],
  cv: [
    "Write accomplishment candidates for a CV or professional profile.",
    "Combine related sources into one or two action-oriented bullets per workstream and omit internal Jira keys from the prose.",
    "Set needsImpact to true whenever the evidence does not contain a measurable or explicit outcome. Never fabricate one.",
    "Return no paragraphs."
  ],
  changelog: [
    "Write release-style change entries grouped by product or module.",
    "Use Added, Changed, or Fixed only when the evidence supports the classification. Omit tag when uncertain.",
    "Do not mention time spent. Return no paragraphs."
  ]
};

const DETAIL_INSTRUCTIONS: Record<RecapDetail, string> = {
  headline: "Headline mode: return a useful non-empty lead (or version for changelog). Keep paragraphs and lines empty because richer local detail is preserved by the app.",
  balanced: "Standard mode: for narrative formats write 2 to 4 connected paragraphs of 2 to 4 sentences each; for list formats keep only the strongest items.",
  detailed: "Detailed mode: for narrative formats write 3 to 6 connected paragraphs of 2 to 4 complete sentences each, proportionate to the evidence and without padding; for list formats add useful context without repeating source metadata."
};

export const buildRecapWorkspacePrompt = (
  draft: RecapDraftVersion,
  format: RecapFormat,
  detail: RecapDetail
) => {
  const isNarrative = format === "perf" || format === "manager";
  return [
  `Write only the ${format} format at ${detail} detail.`,
  ...FORMAT_INSTRUCTIONS[format],
  DETAIL_INSTRUCTIONS[detail],
  "When coverage is partial or sparse, qualify period-wide statements and describe only the available history.",
  ...(isNarrative ? [
    "Themes are evidence clusters, not document sections. Synthesize across them into one cohesive report and do not expose their boundaries as headings.",
    "Return {format,document:{lead,paragraphs}}. Every paragraph is {id,text,refs} and may cite allowed refs from any supplied theme.",
    "Return no themes and no bullet lines for this narrative format."
  ] : [
    "You may rename a theme to a clearer product, module, or workstream name using supplied context, but do not change theme ids or move refs between themes.",
    "Return {format,themes:[{id,name,copy:{lead?,version?,paragraphs:[],lines}}]}.",
    "Every line is {id,short,long,refs,tag?,emphasis?,needsImpact?}."
  ]),
  "USER CLAIMS are stored separately by the app. Use them to understand the evidence, but do not repeat their text in short or long.",
  ...(isNarrative ? [] : ["Every line must cite one or more allowed refs from its theme. Return paragraphs as [] for cv and changelog."]),
  "FACTS:",
  JSON.stringify({
    interval: draft.interval,
    coverage: draft.coverage,
    themes: draft.themes.map((theme) => ({
      id: theme.id,
      suggestedName: theme.name,
      metrics: { hours: theme.hours, prs: theme.pullRequestCount, tickets: theme.ticketCount },
      userClaims: theme.copy.cv.lines
        .filter((line) => line.userImpact?.trim())
        .map((line) => ({ lineId: line.id, refs: line.refs, userImpact: line.userImpact })),
      evidence: draft.sources.filter((source) => theme.sourceIds.includes(source.id)).map((source) => ({
        sourceId: source.id,
        ref: recapSourceRef(source),
        kind: source.kind,
        dates: source.dateKeys ?? [source.dateKey],
        title: source.title,
        notes: source.details ?? (source.detail ? [source.detail] : []),
        minutes: Math.round(source.timeSpentSeconds / 60),
        issueKey: source.issueKey,
        epic: source.epicSummary ?? source.epicKey,
        project: source.projectName ?? source.projectKey,
        components: source.components,
        repository: source.repository,
        pullRequestId: source.pullRequestId,
        role: source.role,
        status: source.status
      }))
    }))
  })
].join("\n");
};

const TAGS = new Set(["Added", "Changed", "Fixed"]);
const numericTokens = (value: string) => value.match(/\b\d+(?:\.\d+)?\b/g) ?? [];

const allowedNumbersForTheme = (theme: RecapTheme, fallback: RecapDraftVersion) => {
  const totalMinutes = Math.round(theme.hours * 60);
  const values = [
    String(theme.hours),
    String(Math.round(theme.hours * 10) / 10),
    String(Math.round(theme.hours)),
    String(totalMinutes),
    String(theme.pullRequestCount),
    String(theme.ticketCount),
    theme.name,
    fallback.interval.label,
    fallback.interval.startDateKey,
    fallback.interval.endDateKeyExclusive,
    String(fallback.coverage.requestedWeeks),
    String(fallback.coverage.elapsedWeeks ?? fallback.coverage.requestedWeeks),
    String(fallback.coverage.jiraWeeks),
    String(fallback.coverage.bitbucketWeeks)
  ];
  for (const source of fallback.sources.filter((item) => theme.sourceIds.includes(item.id))) {
    values.push(
      source.issueKey ?? "",
      source.pullRequestId ? recapSourceRef(source) : "",
      source.title,
      ...(source.details ?? (source.detail ? [source.detail] : [])),
      String(Math.round(source.timeSpentSeconds / 60)),
      String(Math.round(source.timeSpentSeconds / 3600)),
      String(Math.round((source.timeSpentSeconds / 3600) * 10) / 10)
    );
  }
  for (const line of theme.copy.cv.lines) values.push(line.userImpact ?? "");
  return new Set(values.flatMap(numericTokens));
};

const allowedNumbersForDocument = (fallback: RecapDraftVersion) => {
  const allowed = new Set(
    fallback.themes.flatMap((theme) => [...allowedNumbersForTheme(theme, fallback)])
  );
  const totalHours = fallback.themes.reduce((sum, theme) => sum + theme.hours, 0);
  const totalMinutes = Math.round(totalHours * 60);
  for (const value of [
    String(totalHours),
    String(Math.round(totalHours * 10) / 10),
    String(Math.round(totalHours)),
    String(totalMinutes),
    String(fallback.themes.length)
  ]) {
    for (const token of numericTokens(value)) allowed.add(token);
  }
  return allowed;
};

const validateNumbers = (values: Array<string | undefined>, allowed: Set<string>) => {
  const claims = values.filter(Boolean).flatMap((value) => numericTokens(value!));
  if (claims.some((claim) => !allowed.has(claim))) throw new Error("unsupported numeric claim");
};

const validatedRefs = (value: unknown, allowed: Set<string>) => {
  const refs = Array.isArray(value) ? value.map(String) : [];
  if (!refs.length || refs.some((ref) => !allowed.has(ref))) throw new Error("invalid refs");
  return refs;
};

const parseParagraphs = (
  value: unknown,
  allowed: Set<string>,
  allowedNumbers: Set<string>,
  themeId: string,
  format: RecapFormat
): RecapCopyParagraph[] => {
  if (!Array.isArray(value)) return [];
  return value.map((paragraphValue, index) => {
    const paragraph = paragraphValue as Record<string, unknown>;
    const text = String(paragraph.text ?? "").trim();
    if (!text) throw new Error("empty paragraph");
    validateNumbers([text], allowedNumbers);
    return {
      id: String(paragraph.id ?? `${themeId}:${format}:paragraph:${index}`),
      text,
      refs: validatedRefs(paragraph.refs, allowed)
    };
  });
};

const parseLines = (
  value: unknown,
  allowed: Set<string>,
  allowedNumbers: Set<string>,
  themeId: string,
  format: RecapFormat,
  existingLines: RecapCopyLine[]
): RecapCopyLine[] => {
  if (!Array.isArray(value)) throw new Error("missing lines");
  const parsedLines = value.map((lineValue, index): RecapCopyLine => {
    const line = lineValue as Record<string, unknown>;
    const tag = line.tag ? String(line.tag) : undefined;
    if (tag && !TAGS.has(tag)) throw new Error("invalid tag");
    if (format !== "changelog" && tag) throw new Error("unexpected tag");
    const short = String(line.short ?? "").trim();
    const long = String(line.long ?? "").trim();
    if (!short || !long) throw new Error("empty copy");
    const emphasis = line.emphasis ? String(line.emphasis) : undefined;
    validateNumbers([short, long, emphasis], allowedNumbers);
    const refs = validatedRefs(line.refs, allowed);
    return {
      id: String(line.id ?? `${themeId}:${format}:line:${index}`),
      short,
      long,
      refs,
      tag: tag as RecapCopyLine["tag"],
      emphasis,
      needsImpact: format === "cv" ? line.needsImpact !== false : undefined
    };
  });
  if (format !== "cv") return parsedLines;

  const existingImpacts = existingLines.filter((line) => line.userImpact?.trim());
  const matches = existingImpacts.flatMap((existing, existingIndex) => parsedLines.flatMap((incoming, incomingIndex) => {
    const overlap = existing.refs.filter((ref) => incoming.refs.includes(ref)).length;
    if (!overlap) return [];
    const exactRefs = existing.refs.length === incoming.refs.length
      && existing.refs.every((ref) => incoming.refs.includes(ref));
    const score = (existing.id === incoming.id ? 1_000_000 : 0) + (exactRefs ? 10_000 : 0) + overlap;
    return [{ existingIndex, incomingIndex, score }];
  })).sort((a, b) => b.score - a.score || a.incomingIndex - b.incomingIndex || a.existingIndex - b.existingIndex);
  const assignedExisting = new Set<number>();
  const assignedIncoming = new Set<number>();
  const impactByIncoming = new Map<number, string>();
  for (const match of matches) {
    if (assignedExisting.has(match.existingIndex) || assignedIncoming.has(match.incomingIndex)) continue;
    assignedExisting.add(match.existingIndex);
    assignedIncoming.add(match.incomingIndex);
    impactByIncoming.set(match.incomingIndex, existingImpacts[match.existingIndex].userImpact!);
  }
  return parsedLines.map((line, index) => {
    const userImpact = impactByIncoming.get(index);
    return { ...line, needsImpact: userImpact ? false : line.needsImpact, userImpact };
  });
};

const mergeParagraphsForDetail = (
  incoming: RecapCopyParagraph[],
  fallback: RecapCopyParagraph[] | undefined,
  detail: RecapDetail
) => {
  const existing = fallback ?? [];
  if (detail === "headline") return existing;
  if (detail === "detailed") return incoming;
  return [...incoming, ...existing.slice(incoming.length)];
};

const mergeLinesForDetail = (incoming: RecapCopyLine[], fallback: RecapCopyLine[], detail: RecapDetail) => {
  if (detail === "headline") return fallback;
  if (detail === "detailed") return incoming;
  const coveredRefs = new Set(incoming.flatMap((line) => line.refs));
  return [...incoming, ...fallback.filter((line) => !line.refs.some((ref) => coveredRefs.has(ref)))];
};

export const parseRecapWorkspaceDraft = (
  raw: string,
  fallback: RecapDraftVersion,
  format: RecapFormat,
  detail: RecapDetail
): RecapDraftVersion | undefined => {
  try {
    const parsed = JSON.parse(raw) as {
      format?: string;
      document?: Record<string, unknown>;
      themes?: Array<Record<string, unknown>>;
    };
    if (parsed.format !== format) return undefined;
    const isNarrative = format === "perf" || format === "manager";
    if (isNarrative) {
      if (!parsed.document || typeof parsed.document !== "object") return undefined;
      const allowed = new Set(fallback.sources.map(recapSourceRef));
      const allowedNumbers = allowedNumbersForDocument(fallback);
      const lead = String(parsed.document.lead ?? "").trim();
      if (!lead) throw new Error("missing report lead");
      validateNumbers([lead], allowedNumbers);
      const paragraphs = parseParagraphs(
        parsed.document.paragraphs,
        allowed,
        allowedNumbers,
        "report",
        format
      );
      if (detail !== "headline" && !paragraphs.length) throw new Error("missing report narrative");
      const fallbackCopy = recapNarrativeCopy(fallback, format);
      return {
        ...fallback,
        generator: "ai",
        aiFormats: Array.from(new Set([...(fallback.aiFormats ?? []), format])),
        narratives: {
          ...fallback.narratives,
          [format]: {
            lead,
            paragraphs: mergeParagraphsForDetail(paragraphs, fallbackCopy.paragraphs, detail),
            lines: []
          }
        }
      };
    }
    if (!Array.isArray(parsed.themes)) return undefined;
    const byId = new Map(parsed.themes.map((theme) => [String(theme.id ?? ""), theme]));
    const themes: RecapTheme[] = fallback.themes.map((base) => {
      const incoming = byId.get(base.id);
      if (!incoming || typeof incoming.copy !== "object" || !incoming.copy) throw new Error("missing theme");
      const allowed = new Set(
        fallback.sources
          .filter((source) => base.sourceIds.includes(source.id))
          .map(recapSourceRef)
      );
      const allowedNumbers = allowedNumbersForTheme(base, fallback);
      const name = typeof incoming.name === "string" && incoming.name.trim() ? incoming.name.trim() : base.name;
      validateNumbers([name], allowedNumbers);
      const block = incoming.copy as Record<string, unknown>;
      const lead = block.lead ? String(block.lead).trim() : undefined;
      const version = block.version ? String(block.version).trim() : undefined;
      validateNumbers([lead, version], allowedNumbers);
      const paragraphs = parseParagraphs(block.paragraphs, allowed, allowedNumbers, base.id, format);
      const lines = parseLines(block.lines, allowed, allowedNumbers, base.id, format, base.copy[format].lines);
      const headline = format === "changelog" ? version : lead;
      if (detail === "headline" && !headline) throw new Error("missing headline copy");
      if (detail !== "headline" && !lines.length) throw new Error("missing lines");
      if (paragraphs.length) throw new Error("unexpected narrative");
      const fallbackCopy = base.copy[format];
      const copy = {
        ...base.copy,
        [format]: {
          lead: lead ?? fallbackCopy.lead,
          version: version ?? fallbackCopy.version,
          paragraphs: mergeParagraphsForDetail(paragraphs, fallbackCopy.paragraphs, detail),
          lines: mergeLinesForDetail(lines, fallbackCopy.lines, detail)
        }
      };
      return { ...base, name, copy };
    });
    if (byId.size !== fallback.themes.length) return undefined;
    return {
      ...fallback,
      generator: "ai",
      aiFormats: Array.from(new Set([...(fallback.aiFormats ?? []), format])),
      themes
    };
  } catch {
    return undefined;
  }
};
