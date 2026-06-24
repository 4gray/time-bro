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

  it("renders multiple action buttons", () => {
    const markup = renderToStaticMarkup(
      <SnackbarStack
        notifications={[
          {
            id: 1,
            kind: "info",
            message: "TimeBro v1.1.0 is available.",
            actions: [
              { label: "Release notes", icon: "notes", onAction: () => undefined },
              { label: "Download", icon: "download", onAction: () => undefined }
            ],
            autoDismiss: false
          }
        ]}
        onDismiss={() => undefined}
      />
    );

    expect(markup).toContain("Release notes");
    expect(markup).toContain("Download");
    expect(markup).toContain("snackbar-actions");
  });
});
