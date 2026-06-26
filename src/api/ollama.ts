import { buildEnhancePrompt, ENHANCE_SYSTEM_PROMPT, parseEnhanceResponse } from "../domain/enhancePrompt";
import type { ReconstructDay } from "../domain/reconstruct";
import { nativeApi } from "./native";

/**
 * Renderer-side facade for the optional local-AI layer. Everything here is gated and
 * degrades gracefully: with no model, no Electron bridge, or any error, callers get the
 * deterministic reconstruction back unchanged. The deterministic core never depends on
 * this module.
 */

export interface OllamaStatus {
  reachable: boolean;
  models: string[];
  /** True when the configured model tag is among the pulled models. */
  modelReady: boolean;
  message?: string;
}

export interface OllamaConnection {
  endpoint: string;
  model: string;
}

const modelMatches = (models: string[], model: string): boolean => {
  const wanted = model.trim().toLowerCase();
  if (!wanted) {
    return false;
  }
  return models.some((available) => {
    const tag = available.trim().toLowerCase();
    // accept "llama3.1" matching "llama3.1:8b" (and vice-versa)
    return tag === wanted || tag.split(":")[0] === wanted.split(":")[0];
  });
};

/** Probes the endpoint and reports the activation-chain state for Settings. */
export const probeOllama = async (connection: OllamaConnection): Promise<OllamaStatus> => {
  const result = await nativeApi.listOllamaModels({ endpoint: connection.endpoint });
  return {
    reachable: result.ok,
    models: result.models,
    modelReady: result.ok && modelMatches(result.models, connection.model),
    message: result.message
  };
};

/**
 * Polishes a deterministic {@link ReconstructDay} with the local model. Returns the input
 * day unchanged if there is nothing to enhance, the model is unreachable, or anything
 * fails — the reconstruction is always preserved.
 */
export const enhanceReconstructDay = async (
  day: ReconstructDay,
  connection: OllamaConnection
): Promise<ReconstructDay> => {
  const hasEnhanceable = day.rows.some((row) => row.kind === "filled" || row.kind === "empty");
  if (!hasEnhanceable) {
    return day;
  }

  try {
    const result = await nativeApi.generateWithOllama({
      endpoint: connection.endpoint,
      model: connection.model,
      system: ENHANCE_SYSTEM_PROMPT,
      prompt: buildEnhancePrompt(day),
      format: "json"
    });

    if (!result.ok || !result.response) {
      return day;
    }

    return parseEnhanceResponse(day, result.response);
  } catch {
    return day;
  }
};
