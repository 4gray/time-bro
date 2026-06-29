// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TicketDetailsProvider } from "./TicketDetailsContext";
import { TicketKeyLink } from "./TicketKeyLink";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("TicketKeyLink", () => {
  it("opens in-app ticket details from the key while preserving the Jira browser link", () => {
    const openTicketDetails = vi.fn();
    const parentClick = vi.fn();

    act(() => {
      root.render(
        <TicketDetailsProvider value={openTicketDetails}>
          <div onClick={parentClick}>
            <TicketKeyLink issueKey="FTDM-397" url="https://example.atlassian.net/browse/FTDM-397" />
          </div>
        </TicketDetailsProvider>
      );
    });

    act(() => {
      container.querySelector<HTMLButtonElement>(".ticket-key-button")?.click();
    });

    expect(openTicketDetails).toHaveBeenCalledWith("FTDM-397");
    expect(parentClick).not.toHaveBeenCalled();

    act(() => {
      container.querySelector<HTMLAnchorElement>(".ticket-jira-link")?.click();
    });

    expect(container.querySelector<HTMLAnchorElement>(".ticket-jira-link")?.href).toBe(
      "https://example.atlassian.net/browse/FTDM-397"
    );
    expect(parentClick).not.toHaveBeenCalled();
  });
});
