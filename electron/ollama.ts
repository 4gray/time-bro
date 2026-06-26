import type {
  OllamaGenerateRequest,
  OllamaGenerateResult,
  OllamaListModelsRequest,
  OllamaListModelsResult
} from "../shared/types";

/**
 * Local-AI (Ollama) client — runs in the Electron **main** process so requests to
 * `localhost:11434` are not subject to renderer CORS, and so the key-less, on-device,
 * no-telemetry contract stays explicit. Every function resolves (never rejects): on any
 * failure it returns `{ ok: false, message }` so the renderer can fall back to the
 * deterministic reconstruction.
 */

const TAGS_TIMEOUT_MS = 4000;
const GENERATE_TIMEOUT_MS = 60_000;

const normalizeEndpoint = (endpoint: string): string => {
  const trimmed = endpoint.trim().replace(/\/+$/, "");
  return trimmed || "http://localhost:11434";
};

const describeError = (error: unknown): string => {
  if (error instanceof Error) {
    if (error.name === "AbortError" || error.name === "TimeoutError") {
      return "Ollama did not respond in time. Is it running?";
    }
    return error.message;
  }
  return "Could not reach Ollama.";
};

interface OllamaTagsResponse {
  models?: Array<{ name?: string; model?: string }>;
}

export const listOllamaModels = async (request: OllamaListModelsRequest): Promise<OllamaListModelsResult> => {
  const endpoint = normalizeEndpoint(request.endpoint);
  try {
    const response = await fetch(`${endpoint}/api/tags`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TAGS_TIMEOUT_MS)
    });

    if (!response.ok) {
      return { ok: false, models: [], message: `Ollama responded with HTTP ${response.status}.` };
    }

    const body = (await response.json()) as OllamaTagsResponse;
    const models = (body.models ?? [])
      .map((entry) => entry.name ?? entry.model ?? "")
      .map((name) => name.trim())
      .filter(Boolean);

    return { ok: true, models };
  } catch (error) {
    return { ok: false, models: [], message: describeError(error) };
  }
};

interface OllamaGenerateResponse {
  response?: string;
}

export const generateWithOllama = async (request: OllamaGenerateRequest): Promise<OllamaGenerateResult> => {
  const endpoint = normalizeEndpoint(request.endpoint);
  const model = request.model.trim();

  if (!model) {
    return { ok: false, message: "No Ollama model selected." };
  }

  try {
    const response = await fetch(`${endpoint}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        model,
        prompt: request.prompt,
        system: request.system,
        stream: false,
        ...(request.format ? { format: request.format } : {})
      }),
      signal: AbortSignal.timeout(GENERATE_TIMEOUT_MS)
    });

    if (!response.ok) {
      return { ok: false, message: `Ollama responded with HTTP ${response.status}.` };
    }

    const body = (await response.json()) as OllamaGenerateResponse;
    const text = body.response?.trim();
    if (!text) {
      return { ok: false, message: "Ollama returned an empty completion." };
    }

    return { ok: true, response: text };
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }
};
