-- 028_job_search.sql
--
-- Per-user job search: career boards, postings, rules, Gmail hits.
-- jobSearchEnabled defaults to false. An admin turns it on per account.
--
-- Register as [ ] in database_updates_master.sql. Do not mark [x].

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "jobSearchEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "gmailRefreshToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "gmailEmail" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "searchRunAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "searchLockedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "searchCursor" TEXT NOT NULL DEFAULT '';

DO $$ BEGIN
    CREATE TYPE "CareerProvider" AS ENUM ('greenhouse', 'lever', 'ashby', 'comeet', 'workday');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PostingSource" AS ENUM ('board', 'alert');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PostingDecisionKind" AS ENUM ('added', 'applied', 'dismissed', 'hidden', 'duplicate');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "MailHitKind" AS ENUM ('alert', 'reply');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "CareerBoard" (
    "id" TEXT NOT NULL,
    "provider" "CareerProvider" NOT NULL,
    "externalKey" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "careersUrl" TEXT NOT NULL DEFAULT '',
    "lastFetchedAt" TIMESTAMP(3),
    "lastError" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareerBoard_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CareerBoard_provider_externalKey_key" ON "CareerBoard"("provider", "externalKey");

CREATE TABLE IF NOT EXISTS "UserBoard" (
    "userId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UserBoard_pkey" PRIMARY KEY ("userId", "boardId")
);

CREATE INDEX IF NOT EXISTS "UserBoard_boardId_idx" ON "UserBoard"("boardId");

CREATE TABLE IF NOT EXISTS "BoardPosting" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "url" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "publishedAt" TIMESTAMP(3),
    "updatedOnly" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoardPosting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BoardPosting_boardId_externalId_key" ON "BoardPosting"("boardId", "externalId");
CREATE INDEX IF NOT EXISTS "BoardPosting_boardId_closedAt_idx" ON "BoardPosting"("boardId", "closedAt");

CREATE TABLE IF NOT EXISTS "SearchSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "terms" TEXT NOT NULL DEFAULT '',
    "excludedTitle" TEXT NOT NULL DEFAULT '',
    "excludedDescription" TEXT NOT NULL DEFAULT '',
    "maxAgeDays" INTEGER NOT NULL DEFAULT 14,
    "hideJunior" BOOLEAN NOT NULL DEFAULT false,
    "regionTelAviv" BOOLEAN NOT NULL DEFAULT true,
    "regionSharon" BOOLEAN NOT NULL DEFAULT true,
    "regionCenter" BOOLEAN NOT NULL DEFAULT true,
    "regionJerusalem" BOOLEAN NOT NULL DEFAULT true,
    "regionJudea" BOOLEAN NOT NULL DEFAULT true,
    "regionSouth" BOOLEAN NOT NULL DEFAULT true,
    "regionNorth" BOOLEAN NOT NULL DEFAULT true,
    "extraPlaces" TEXT NOT NULL DEFAULT '',
    "alertSenders" TEXT NOT NULL DEFAULT '',
    "confirmPhrases" TEXT NOT NULL DEFAULT '',
    "rejectPhrases" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "SearchSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SearchSettings_userId_key" ON "SearchSettings"("userId");

CREATE TABLE IF NOT EXISTS "SearchRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SearchRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SearchRule_userId_ruleKey_key" ON "SearchRule"("userId", "ruleKey");

CREATE TABLE IF NOT EXISTS "PostingDecision" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "PostingSource" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "decision" "PostingDecisionKind" NOT NULL,
    "jobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostingDecision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PostingDecision_userId_source_sourceId_key" ON "PostingDecision"("userId", "source", "sourceId");
CREATE INDEX IF NOT EXISTS "PostingDecision_jobId_idx" ON "PostingDecision"("jobId");

CREATE TABLE IF NOT EXISTS "MailHit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gmailId" TEXT NOT NULL,
    "kind" "MailHitKind" NOT NULL,
    "companyName" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "url" TEXT NOT NULL DEFAULT '',
    "snippet" TEXT NOT NULL DEFAULT '',
    "verdict" TEXT NOT NULL DEFAULT '',
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "jobId" TEXT,
    "messageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailHit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MailHit_userId_gmailId_key" ON "MailHit"("userId", "gmailId");

CREATE TABLE IF NOT EXISTS "AlertPosting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mailHitId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "url" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertPosting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AlertPosting_userId_externalId_key" ON "AlertPosting"("userId", "externalId");
CREATE INDEX IF NOT EXISTS "AlertPosting_mailHitId_idx" ON "AlertPosting"("mailHitId");

DO $$ BEGIN
    ALTER TABLE "UserBoard" ADD CONSTRAINT "UserBoard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "UserBoard" ADD CONSTRAINT "UserBoard_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "CareerBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "BoardPosting" ADD CONSTRAINT "BoardPosting_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "CareerBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "SearchSettings" ADD CONSTRAINT "SearchSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "SearchRule" ADD CONSTRAINT "SearchRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "PostingDecision" ADD CONSTRAINT "PostingDecision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "MailHit" ADD CONSTRAINT "MailHit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "AlertPosting" ADD CONSTRAINT "AlertPosting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "AlertPosting" ADD CONSTRAINT "AlertPosting_mailHitId_fkey" FOREIGN KEY ("mailHitId") REFERENCES "MailHit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
