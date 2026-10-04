-- 016_companies.sql
--
-- A company is a record a job, contact, or note can point at.
-- Each job belongs to one company. A contact can belong to many.
-- Existing jobs are linked to a company created from companyName.
--
-- Register as [ ] in database_updates_master.sql. Do not mark [x].

CREATE TABLE IF NOT EXISTS "Company" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "offices" TEXT NOT NULL DEFAULT '',
    "websiteHome" TEXT NOT NULL DEFAULT '',
    "websitePeople" TEXT NOT NULL DEFAULT '',
    "websiteJobs" TEXT NOT NULL DEFAULT '',
    "linkedinUrl" TEXT NOT NULL DEFAULT '',
    "following" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ContactCompany" (
    "contactId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "ContactCompany_pkey" PRIMARY KEY ("contactId", "companyId")
);

ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "companyId" TEXT;

DO $$ BEGIN
    ALTER TABLE "Company" ADD CONSTRAINT "Company_userId_nameKey_key" UNIQUE ("userId", "nameKey");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

INSERT INTO "Company" ("id", "userId", "name", "nameKey", "following", "createdAt", "updatedAt")
SELECT
    'c' || md5("userId" || '|' || lower(btrim("companyName"))),
    "userId",
    min(btrim("companyName")),
    lower(btrim("companyName")),
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Job"
WHERE btrim("companyName") <> ''
GROUP BY "userId", lower(btrim("companyName"))
ON CONFLICT ("userId", "nameKey") DO NOTHING;

UPDATE "Job" AS job
SET "companyId" = company."id"
FROM "Company" AS company
WHERE job."companyId" IS NULL
  AND company."userId" = job."userId"
  AND company."nameKey" = lower(btrim(job."companyName"))
  AND btrim(job."companyName") <> '';

INSERT INTO "Company" ("id", "userId", "name", "nameKey", "following", "createdAt", "updatedAt")
SELECT
    'c' || md5(job."userId" || '|'),
    job."userId",
    '',
    '',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Job" AS job
WHERE job."companyId" IS NULL
GROUP BY job."userId"
ON CONFLICT ("userId", "nameKey") DO NOTHING;

UPDATE "Job" AS job
SET "companyId" = company."id"
FROM "Company" AS company
WHERE job."companyId" IS NULL
  AND company."userId" = job."userId"
  AND company."nameKey" = '';

ALTER TABLE "Job" ALTER COLUMN "companyId" SET NOT NULL;

DO $$ BEGIN
    ALTER TABLE "Company" ADD CONSTRAINT "Company_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Job" ADD CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Note" ADD CONSTRAINT "Note_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ContactCompany" ADD CONSTRAINT "ContactCompany_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ContactCompany" ADD CONSTRAINT "ContactCompany_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "Company_userId_following_idx" ON "Company"("userId", "following");
CREATE INDEX IF NOT EXISTS "Job_companyId_idx" ON "Job"("companyId");
CREATE INDEX IF NOT EXISTS "Note_companyId_idx" ON "Note"("companyId");
CREATE INDEX IF NOT EXISTS "ContactCompany_companyId_idx" ON "ContactCompany"("companyId");
