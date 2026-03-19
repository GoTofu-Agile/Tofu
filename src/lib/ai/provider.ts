import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";

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

export function getModel() {
  const provider = (process.env.LLM_PROVIDER || "openai") as Provider;

  if (!(provider in providers)) {
    throw new Error(
      `Unknown LLM provider: ${provider}. Supported: ${Object.keys(providers).join(", ")}`
    );
  }

  const keyName = requiredKeys[provider];
  if (!process.env[keyName]) {
    throw new Error(
      `Missing API key: Set ${keyName} in your .env.local file to use the "${provider}" provider.`
    );
  }

  return providers[provider]();
}

export function getEmbeddingModel() {
  // Embeddings currently only supported via OpenAI
  return openai.embedding("text-embedding-3-small");
}
