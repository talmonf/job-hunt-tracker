export const AI_PROVIDERS = ["anthropic", "google", "openai", "openrouter"] as const;

export const PROVIDER_KEY_URL = {
  openai: "https://platform.openai.com/api-keys",
  anthropic: "https://platform.claude.com/settings/workspaces/default/keys",
  google: "https://aistudio.google.com/api-keys",
} as const satisfies Partial<Record<(typeof AI_PROVIDERS)[number], string>>;

export const PROVIDER_KEY_LINK_ORDER = ["openai", "anthropic", "google"] as const satisfies ReadonlyArray<
  keyof typeof PROVIDER_KEY_URL
>;

export type AiProviderId = (typeof AI_PROVIDERS)[number];

export function isAiProvider(value: string): value is AiProviderId {
  return (AI_PROVIDERS as readonly string[]).includes(value);
}

export const DEFAULT_MODEL: Record<AiProviderId, string> = {
  anthropic: "claude-sonnet-4-5",
  google: "gemini-3.5-flash-lite",
  openai: "gpt-4o-mini",
  openrouter: "openai/gpt-4o-mini",
};

const PRICES: Record<string, { inputUsdPerMillion: number; outputUsdPerMillion: number }> = {
  "claude-sonnet-4-5": { inputUsdPerMillion: 3, outputUsdPerMillion: 15 },
  "gemini-2.5-flash": { inputUsdPerMillion: 0.3, outputUsdPerMillion: 2.5 },
  "gemini-3.5-flash-lite": { inputUsdPerMillion: 0.3, outputUsdPerMillion: 2.5 },
  "gpt-4o-mini": { inputUsdPerMillion: 0.15, outputUsdPerMillion: 0.6 },
  "openai/gpt-4o-mini": { inputUsdPerMillion: 0.15, outputUsdPerMillion: 0.6 },
};

const FALLBACK_PRICE = { inputUsdPerMillion: 3, outputUsdPerMillion: 15 };

export function modelPrice(model: string) {
  return PRICES[model] ?? FALLBACK_PRICE;
}

export function platformKey(provider: AiProviderId): string | null {
  const env: Record<AiProviderId, string | undefined> = {
    anthropic: process.env.AI_PLATFORM_ANTHROPIC_KEY,
    google: process.env.AI_PLATFORM_GOOGLE_KEY,
    openai: process.env.AI_PLATFORM_OPENAI_KEY,
    openrouter: process.env.AI_PLATFORM_OPENROUTER_KEY,
  };
  const key = env[provider]?.trim();
  return key || null;
}

export function lastFour(secret: string): string {
  const trimmed = secret.trim();
  return trimmed.slice(-4);
}
