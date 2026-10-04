-- 018_ai_usage_cost_usd.sql
--
-- Provider list price for each model call, in millionths of a US dollar.
--
-- Register as [ ] in database_updates_master.sql. Do not mark [x].

ALTER TABLE "AiUsage" ADD COLUMN IF NOT EXISTS "costUsdMicros" INTEGER NOT NULL DEFAULT 0;

UPDATE "AiUsage"
SET "costUsdMicros" = ROUND(
  CASE "model"
    WHEN 'claude-sonnet-4-5' THEN "inputTokens" * 3 + "outputTokens" * 15
    WHEN 'gemini-2.5-flash' THEN "inputTokens" * 0.3 + "outputTokens" * 2.5
    WHEN 'gpt-4o-mini' THEN "inputTokens" * 0.15 + "outputTokens" * 0.6
    WHEN 'openai/gpt-4o-mini' THEN "inputTokens" * 0.15 + "outputTokens" * 0.6
    ELSE "inputTokens" * 3 + "outputTokens" * 15
  END
)::integer;

CREATE INDEX IF NOT EXISTS "AiUsage_createdAt_idx" ON "AiUsage"("createdAt");
