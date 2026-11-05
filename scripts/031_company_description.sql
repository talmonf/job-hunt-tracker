-- 031_company_description.sql
--
-- A free-text description of the company, shown under its name.
--
-- Register as [ ] in database_updates_master.sql. Do not mark [x].

ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL DEFAULT '';
