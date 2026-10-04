import type { Lang, MessageKey } from "@/lib/i18n";
import { t } from "@/lib/i18n";

const FEATURE_KEYS: Record<string, MessageKey> = {
  import: "featureImport",
  compare: "featureCompare",
  "job-details": "featureJobDetails",
  test: "featureTest",
};

const TOOL_KEYS: Record<string, MessageKey> = {
  anthropic: "toolAnthropic",
  google: "toolGoogle",
  openai: "toolOpenai",
  openrouter: "toolOpenrouter",
};

export function featureLabel(lang: Lang, feature: string): string {
  const key = FEATURE_KEYS[feature];
  return key ? t(lang, key) : feature;
}

export function toolLabel(lang: Lang, provider: string): string {
  const key = TOOL_KEYS[provider];
  return key ? t(lang, key) : provider;
}
