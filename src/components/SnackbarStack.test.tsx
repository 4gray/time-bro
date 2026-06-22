import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SnackbarStack } from "./SnackbarStack";

describe("SnackbarStack", () => {
  it("renders an optional action button", () => {
    const markup = renderToStaticMarkup(
      <SnackbarStack
        notifications={[
          {
            id: 1,
            kind: "info",
            message: "TimeBro v1.1.0 is available.",
            actionLabel: "Open releases",
            onAction: () => undefined,
            autoDismiss: false
          }
        ]}
        onDismiss={() => undefined}
      />
    );

    expect(markup).toContain("TimeBro v1.1.0 is available.");
    expect(markup).toContain("Open releases");
    expect(markup).toContain("snackbar-action");
  });
});
