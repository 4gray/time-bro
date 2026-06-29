import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdfRenderer } from "./AdfRenderer";

describe("AdfRenderer", () => {
  it("renders Jira ADF structure instead of flattening it to plain text", () => {
    const markup = renderToStaticMarkup(
      <AdfRenderer
        document={{
          type: "doc",
          version: 1,
          content: [
            {
              type: "heading",
              attrs: { level: 3 },
              content: [{ type: "text", text: "Acceptance criteria" }]
            },
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Make " },
                { type: "text", text: "ticket details", marks: [{ type: "strong" }] },
                { type: "text", text: " readable." }
              ]
            },
            {
              type: "bulletList",
              content: [
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Show Jira description." }]
                    }
                  ]
                }
              ]
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Spec",
                  marks: [{ type: "link", attrs: { href: "https://example.test/spec" } }]
                }
              ]
            }
          ]
        }}
      />
    );

    expect(markup).toContain("<h3>Acceptance criteria</h3>");
    expect(markup).toContain("<strong>ticket details</strong>");
    expect(markup).toContain("<ul>");
    expect(markup).toContain("<li>");
    expect(markup).toContain("href=\"https://example.test/spec\"");
  });

  it("uses the plain fallback when the ADF document is empty", () => {
    expect(renderToStaticMarkup(<AdfRenderer document={undefined} fallback="No description" />)).toBe(
      "<p>No description</p>"
    );
  });
});
