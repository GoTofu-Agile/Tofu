import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import type { PersonaQualityTier } from "@/lib/personas/persona-creation-policy";

const providers = {
  openai: () => openai(process.env.OPENAI_MODEL || "gpt-4o"),
  claude: () =>
    anthropic(process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514"),
  gemini: () => google(process.env.GEMINI_MODEL || "gemini-2.0-flash"),
} as const;

type Provider = keyof typeof providers;

const requiredKeys: Record<Provider, string> = {
  openai: "OPENAI_API_KEY",
  claude: "ANTHROPIC_API_KEY",
  gemini: "GOOGLE_GENERATIVE_AI_API_KEY",
};

function hasProviderKey(provider: Provider) {
  const keyName = requiredKeys[provider];
  return Boolean(process.env[keyName]);
}

function resolveProviderWithFallback(): Provider {
  const requested = (process.env.LLM_PROVIDER || "openai") as Provider;
  if (requested in providers && hasProviderKey(requested)) return requested;

  const firstAvailable = (Object.keys(providers) as Provider[]).find((provider) =>
    hasProviderKey(provider)
  );
  if (firstAvailable) {
    if (requested in providers && requested !== firstAvailable) {
      // Keep this non-fatal: local envs often drift while switching providers.
      console.warn(
        `LLM_PROVIDER is "${requested}" but its API key is missing. Falling back to "${firstAvailable}".`
      );
    }
    return firstAvailable;
  }

  return requested;
}

export function getModel() {
  const provider = resolveProviderWithFallback();

  if (!(provider in providers)) {
    throw new Error(
      `Unknown LLM provider: ${provider}. Supported: ${Object.keys(providers).join(", ")}`
    );
  }

  const keyName = requiredKeys[provider];
  if (!process.env[keyName]) {
    throw new Error(
      `Missing API key: Set ${keyName} in your .env.local file (or configure another provider key) to use "${provider}".`
    );
  }

  return providers[provider]();
}

export function getEmbeddingModel() {
  // Embeddings currently only supported via OpenAI
  return openai.embedding("text-embedding-3-small");
}

/**
 * Persona JSON generation: model quality scales with workspace tier (see persona-creation-policy).
 * Override per tier with PERSONA_MODEL_TIER_1 / _2 / _3 (same provider as LLM_PROVIDER).
 */
export function getPersonaGenerationModel(tier: PersonaQualityTier) {
  const provider = resolveProviderWithFallback();

  if (!(provider in providers)) {
    throw new Error(
      `Unknown LLM provider: ${provider}. Supported: ${Object.keys(providers).join(", ")}`
    );
  }

  const keyName = requiredKeys[provider];
  if (!process.env[keyName]) {
    throw new Error(
      `Missing API key: Set ${keyName} in your .env.local file (or configure another provider key) to use "${provider}".`
    );
  }

  const t1 = process.env.PERSONA_MODEL_TIER_1;
  const t2 = process.env.PERSONA_MODEL_TIER_2;
  const t3 = process.env.PERSONA_MODEL_TIER_3;

  if (provider === "openai") {
    const id =
      tier === 1
        ? t1 || "gpt-4o-mini"
        : tier === 2
          ? t2 || process.env.OPENAI_MODEL || "gpt-4o"
          : t3 || process.env.OPENAI_MODEL || "gpt-4o";
    return openai(id);
  }

  if (provider === "claude") {
    const id =
      tier === 1
        ? t1 || "claude-3-5-haiku-20241022"
        : tier === 2
          ? t2 || process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514"
          : t3 || process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514";
    return anthropic(id);
  }

  const id =
    tier === 1
      ? t1 || "gemini-2.0-flash"
      : tier === 2
        ? t2 || process.env.GEMINI_MODEL || "gemini-2.0-flash"
        : t3 || process.env.GEMINI_MODEL || "gemini-2.0-flash";
  return google(id);
}
