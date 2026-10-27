-- 027_activity.sql
--
-- Page views and control clicks for signed-in accounts.
-- Paths only: record ids are replaced, and names are not stored.
--
-- Register as [ ] in database_updates_master.sql. Do not mark [x].

DO $$ BEGIN
    CREATE TYPE "ActivityKind" AS ENUM ('page', 'click');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "ActivityEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "ActivityKind" NOT NULL,
    "path" TEXT NOT NULL,
    "control" TEXT NOT NULL DEFAULT '',
    "target" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ActivityEvent_userId_createdAt_idx" ON "ActivityEvent"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "ActivityEvent_createdAt_idx" ON "ActivityEvent"("createdAt");
CREATE INDEX IF NOT EXISTS "ActivityEvent_kind_createdAt_idx" ON "ActivityEvent"("kind", "createdAt");

DO $$ BEGIN
    ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
