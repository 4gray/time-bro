import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TicketStatusBadge } from "./TicketStatusBadge";

describe("TicketStatusBadge", () => {
  it("renders the Jira status label with category styling", () => {
    const markup = renderToStaticMarkup(
      <TicketStatusBadge statusName="Selected for Development" statusCategory="new" />
    );

    expect(markup).toContain("ticket-status-badge is-new");
    expect(markup).toContain("Selected for Development");
    expect(markup).toContain("Jira status: Selected for Development");
  });
});
