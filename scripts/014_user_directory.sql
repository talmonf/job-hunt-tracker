-- 014_user_directory.sql
--
-- Signup method, last access, and a Google OAuth test-user checklist.
-- Promote the built-in admin.
--
-- Register as [ ] in database_updates_master.sql. Do not mark [x].

DO $$ BEGIN
    CREATE TYPE "RegistrationMethod" AS ENUM ('password', 'google');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "registeredWith" "RegistrationMethod" NOT NULL DEFAULT 'password';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastAccessAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "audienceTestUser" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User"
SET "registeredWith" = 'google'
WHERE "googleAccountId" IS NOT NULL AND "passwordHash" IS NULL;

UPDATE "User"
SET role = 'admin'
WHERE email = 'talmonf@gmail.com';
