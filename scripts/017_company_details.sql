-- 017_company_details.sql
--
-- Date founded, employee-count band, company tags, and the dates a
-- contact worked at a company.
--
-- Register as [ ] in database_updates_master.sql. Do not mark [x].

DO $$ BEGIN
    CREATE TYPE "CompanySize" AS ENUM (
        'under_10',
        'between_10_30',
        'between_31_100',
        'between_101_200',
        'between_201_1000',
        'between_1001_5000',
        'over_5000'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "foundedOn" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "employeeCount" "CompanySize";

ALTER TABLE "ContactCompany" ADD COLUMN IF NOT EXISTS "startedOn" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ContactCompany" ADD COLUMN IF NOT EXISTS "startedUnknown" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ContactCompany" ADD COLUMN IF NOT EXISTS "endedOn" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ContactCompany" ADD COLUMN IF NOT EXISTS "endedUnknown" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "CompanyTag" (
    "companyId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "CompanyTag_pkey" PRIMARY KEY ("companyId", "tagId")
);

DO $$ BEGIN
    ALTER TABLE "CompanyTag" ADD CONSTRAINT "CompanyTag_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "CompanyTag" ADD CONSTRAINT "CompanyTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "CompanyTag_tagId_idx" ON "CompanyTag"("tagId");
