import { afterEach, describe, expect, it, vi } from "vitest";
import type { OllamaGenerateResult } from "../../shared/types";
import { polishRecap } from "./ollama";
import { nativeApi } from "./native";

const connection = { endpoint: "http://localhost:11434", model: "llama3.1:8b" };
const recap = "Yesterday (Fri Jun 19) — 2h tracked.\n\nTickets (2h):\n• ABC-1 Thing — 2h";

const mockGenerate = (impl: () => Promise<OllamaGenerateResult>) =>
  vi.spyOn(nativeApi, "generateWithOllama").mockImplementation(impl);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("polishRecap", () => {
  it("returns the trimmed model prose on success", async () => {
    mockGenerate(async () => ({ ok: true, response: "  I shipped ABC-1 yesterday.  " }));
    expect(await polishRecap(recap, connection)).toBe("I shipped ABC-1 yesterday.");
  });

  it("degrades to the deterministic text when the call fails", async () => {
    mockGenerate(async () => ({ ok: false, message: "offline" }));
    expect(await polishRecap(recap, connection)).toBe(recap);
  });

  it("degrades when the response is empty", async () => {
    mockGenerate(async () => ({ ok: true, response: "" }));
    expect(await polishRecap(recap, connection)).toBe(recap);
  });

  it("degrades when the bridge throws", async () => {
    mockGenerate(async () => {
      throw new Error("no bridge");
    });
    expect(await polishRecap(recap, connection)).toBe(recap);
  });

  it("never calls the model for empty input", async () => {
    const generate = mockGenerate(async () => ({ ok: true, response: "x" }));
    expect(await polishRecap("   ", connection)).toBe("   ");
    expect(generate).not.toHaveBeenCalled();
  });
});
