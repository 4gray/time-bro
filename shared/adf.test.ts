import { describe, expect, it } from "vitest";
import { adfToPlainText } from "./adf";

describe("adfToPlainText", () => {
  it("flattens Jira worklog comments from Atlassian document format", () => {
    const comment = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "I did " },
            { type: "text", text: "some work" },
            { type: "hardBreak" },
            { type: "text", text: "here." }
          ]
        }
      ]
    };

    expect(adfToPlainText(comment)).toBe("I did some work here.");
  });

  it("supports plain strings and missing comments", () => {
    expect(adfToPlainText("  Checked rollout logs  ")).toBe("Checked rollout logs");
    expect(adfToPlainText(undefined)).toBe("");
  });
});
