import type { AiProviderId } from "./providers";

export const SPONSORED_FEATURES = ["job-details", "import", "compare"] as const;

export type SponsoredFeature = (typeof SPONSORED_FEATURES)[number];

export const SPONSORED_PROVIDER_ORDER = ["google", "openai", "anthropic"] as const;

export type FillAccess = "sponsored" | "ownKey" | "blocked";

export function isSponsoredFeature(value: string): value is SponsoredFeature {
  return (SPONSORED_FEATURES as readonly string[]).includes(value);
}

export function fillAccess(input: { sponsored: boolean; hasOwnKey: boolean }): FillAccess {
  if (input.sponsored) return "sponsored";
  if (input.hasOwnKey) return "ownKey";
  return "blocked";
}

export function sponsoredProvider(hasKey: (provider: AiProviderId) => boolean, granted: readonly string[]): AiProviderId | null {
  return SPONSORED_PROVIDER_ORDER.find((provider) => granted.includes(provider) && hasKey(provider)) ?? null;
}
