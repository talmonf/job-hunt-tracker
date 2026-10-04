-- 019_platform_key_grants.sql
--
-- Per-user permission to spend a built-in platform key (Anthropic, Google, OpenAI).
-- No rows means no user can use those keys.
--
-- Register as [ ] in database_updates_master.sql. Do not mark [x].

CREATE TABLE IF NOT EXISTS "PlatformKeyGrant" (
    "userId" TEXT NOT NULL,
    "provider" "AiProvider" NOT NULL,

    CONSTRAINT "PlatformKeyGrant_pkey" PRIMARY KEY ("userId", "provider")
);

DO $$ BEGIN
    ALTER TABLE "PlatformKeyGrant" ADD CONSTRAINT "PlatformKeyGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
