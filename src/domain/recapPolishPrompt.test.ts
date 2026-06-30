import { describe, expect, it } from "vitest";
import { RECAP_POLISH_SYSTEM_PROMPT, buildRecapPolishPrompt } from "./recapPolishPrompt";

describe("buildRecapPolishPrompt", () => {
  it("embeds the recap text and asks for 2-3 spoken sentences", () => {
    const recap = "Yesterday (Fri Jun 19) — 2h tracked.\n\nTickets (2h):\n• ABC-1 Thing — 2h";
    const prompt = buildRecapPolishPrompt(recap);
    expect(prompt).toContain(recap);
    expect(prompt).toMatch(/2-3 spoken sentences/);
  });
});

describe("RECAP_POLISH_SYSTEM_PROMPT", () => {
  it("constrains the model to prose and forbids invention", () => {
    expect(RECAP_POLISH_SYSTEM_PROMPT).toMatch(/prose only/i);
    expect(RECAP_POLISH_SYSTEM_PROMPT).toMatch(/never invent/i);
  });
});
