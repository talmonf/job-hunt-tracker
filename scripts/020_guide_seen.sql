-- 020_guide_seen.sql
--
-- First-run getting-started page. Null means the account has not dismissed it.
-- Accounts that already exist are marked seen so they are not sent through the guide.
-- Re-running this script does not mark later accounts as seen.
--
-- Register as [ ] in database_updates_master.sql. Do not mark [x].

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'User'
          AND column_name = 'guideSeenAt'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "guideSeenAt" TIMESTAMP(3);
        UPDATE "User" SET "guideSeenAt" = CURRENT_TIMESTAMP;
    END IF;
END $$;
