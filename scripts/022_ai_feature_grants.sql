-- 022_ai_feature_grants.sql
--
-- Per-user sponsorship of an AI feature. A granted feature runs on the
-- platform key and is not taken from the user's credit balance.
--
-- Register as [ ] in database_updates_master.sql. Do not mark [x].

ALTER TYPE "AiPaySource" ADD VALUE IF NOT EXISTS 'sponsored';

CREATE TABLE IF NOT EXISTS "AiFeatureGrant" (
    "userId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,

    CONSTRAINT "AiFeatureGrant_pkey" PRIMARY KEY ("userId", "feature")
);

DO $$ BEGIN
    ALTER TABLE "AiFeatureGrant" ADD CONSTRAINT "AiFeatureGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
