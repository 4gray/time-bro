import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QuickLogSheet } from "./QuickLogSheet";

const context = {
  ticketKey: "ABC-1",
  ticketSummary: "Review duration guard",
  dateKey: "2026-06-18",
  dayLabel: "THU · 18 JUN · 10:00",
  hours: 2,
  startedMinutes: 600,
  timelineEndMinutes: 1200,
  comment: ""
};

describe("QuickLogSheet", () => {
  it("explains and blocks confirmation when the selected interval is unavailable", () => {
    const markup = renderToStaticMarkup(
      <QuickLogSheet
        context={context}
        color={{ seg: "#5b8cff", text: "#8fb0ff" }}
        isLogging={false}
        validationMessage="Choose a shorter duration or another time — this interval is unavailable."
        onChangeHours={() => undefined}
        onChangeComment={() => undefined}
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />
    );

    expect(markup).toContain('role="alert"');
    expect(markup).toContain("this interval is unavailable");
    expect(markup).toContain('class="quicklog-confirm" disabled=""');
  });
});
