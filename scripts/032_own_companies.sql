-- 032_own_companies.sql
--
-- A company can be one you are building. Consultant, fractional, and independent
-- are engagements. An independent role uses practice statuses. A contact link
-- can name how that person fits.
--
-- Register as [ ] in database_updates_master.sql. Do not mark [x].

DO $$ BEGIN
  CREATE TYPE "CompanyKind" AS ENUM ('tracked', 'own');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CompanyStage" AS ENUM ('idea', 'forming', 'running', 'paused');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "Engagement" ADD VALUE IF NOT EXISTS 'consultant';
ALTER TYPE "Engagement" ADD VALUE IF NOT EXISTS 'fractional';
ALTER TYPE "Engagement" ADD VALUE IF NOT EXISTS 'independent';

ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'exploring';
ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'preparing';
ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'practicing';

ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "kind" "CompanyKind" NOT NULL DEFAULT 'tracked';
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "stage" "CompanyStage";

ALTER TABLE "ContactCompany" ADD COLUMN IF NOT EXISTS "relationship" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "engagementNote" TEXT NOT NULL DEFAULT '';
