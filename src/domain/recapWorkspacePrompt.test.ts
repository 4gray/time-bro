import { describe, expect, it } from "vitest";
import type { RecapDetail, RecapFormat } from "../../shared/types";
import { buildDeterministicRecap, recapIntervalForDate, type RecapEvidenceInput } from "./recapWorkspace";
import { buildRecapWorkspacePrompt, parseRecapWorkspaceDraft } from "./recapWorkspacePrompt";

const fallback = () => {
  const input: RecapEvidenceInput = {
    interval: recapIntervalForDate("week", new Date(2026, 5, 17)),
    syncResults: [], reviewResults: [], activityResults: [], recurringEntries: [], reconstructDrafts: {},
    personalNotes: [{ id: "fact", weekKey: "2026-06-15", dateKey: "2026-06-17", title: "Design review", text: "Reviewed the flow", timeSpentSeconds: 3600, startedISO: "2026-06-17T10:00:00Z", createdAt: "2026-06-17T10:00:00Z", updatedAt: "2026-06-17T10:00:00Z" }]
  };
  return buildDeterministicRecap(input, 1, new Date(2026, 5, 17));
};

const responseFor = (
  draft: ReturnType<typeof fallback>,
  format: RecapFormat,
  mutate?: (copy: Record<string, unknown>) => void
) => JSON.stringify({
  format,
  themes: draft.themes.map((theme) => {
    const copy: Record<string, unknown> = {
      lead: "Grounded update.",
      version: format === "changelog" ? "Grounded release." : undefined,
      paragraphs: format === "perf" || format === "manager"
        ? [{ id: `${format}-paragraph`, text: "The available history records grounded work from the cited evidence.", refs: ["note:fact"] }]
        : [],
      lines: [{
        id: `${format}-line`,
        short: "Completed grounded work.",
        long: "Completed grounded work from the cited evidence.",
        refs: ["note:fact"],
        needsImpact: format === "cv"
      }]
    };
    mutate?.(copy);
    return { id: theme.id, name: theme.name, copy };
  })
});

describe("Recap AI grounding", () => {
  it("prompts for one audience and includes rich source and coverage context", () => {
    const draft = fallback();
    const prompt = buildRecapWorkspacePrompt(draft, "perf", "detailed");
    expect(prompt).toContain("Write only the perf format at detailed detail");
    expect(prompt).toContain("note:fact");
    expect(prompt).toContain('"coverage"');
    expect(prompt).toContain('"notes":["Reviewed the flow"]');
  });

  it.each<[RecapFormat, RecapDetail]>([
    ["perf", "detailed"], ["manager", "balanced"], ["cv", "detailed"], ["standup", "headline"], ["changelog", "balanced"]
  ])("accepts grounded %s copy without changing other format drafts", (format, detail) => {
    const draft = fallback();
    const parsed = parseRecapWorkspaceDraft(responseFor(draft, format), draft, format, detail);
    expect(parsed?.generator).toBe("ai");
    expect(parsed?.aiFormats).toContain(format);
    expect(parsed?.themes[0].copy[format].lines[0].refs).toEqual(["note:fact"]);
  });

  it("rejects unknown references, unsupported numbers, unexpected paragraphs, and invalid tags", () => {
    const draft = fallback();
    expect(parseRecapWorkspaceDraft(responseFor(draft, "perf", (copy) => {
      (copy.paragraphs as Array<Record<string, unknown>>)[0].refs = ["unknown"];
    }), draft, "perf", "detailed")).toBeUndefined();
    expect(parseRecapWorkspaceDraft(responseFor(draft, "manager", (copy) => {
      (copy.lines as Array<Record<string, unknown>>)[0].long = "Improved output by 99 percent.";
    }), draft, "manager", "detailed")).toBeUndefined();
    expect(parseRecapWorkspaceDraft(responseFor(draft, "cv", (copy) => {
      copy.paragraphs = [{ text: "Unexpected narrative.", refs: ["note:fact"] }];
    }), draft, "cv", "detailed")).toBeUndefined();
    expect(parseRecapWorkspaceDraft(responseFor(draft, "changelog", (copy) => {
      (copy.lines as Array<Record<string, unknown>>)[0].tag = "Removed";
    }), draft, "changelog", "detailed")).toBeUndefined();
  });

  it("passes user claims as trusted evidence and preserves them across an AI rewrite", () => {
    const draft = fallback();
    draft.themes[0].copy.cv.lines[0].userImpact = "Unblocked the release review for the platform team";
    draft.themes[0].copy.cv.lines[0].needsImpact = false;

    expect(buildRecapWorkspacePrompt(draft, "cv", "detailed")).toContain(
      '"userImpact":"Unblocked the release review for the platform team"'
    );
    const parsed = parseRecapWorkspaceDraft(responseFor(draft, "cv"), draft, "cv", "detailed");
    expect(parsed?.themes[0].copy.cv.lines[0]).toMatchObject({
      needsImpact: false,
      userImpact: "Unblocked the release review for the platform team"
    });
  });
});
