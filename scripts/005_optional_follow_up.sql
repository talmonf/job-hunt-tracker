-- 005_optional_follow_up.sql
--
-- Follow-up date on a job can be cleared.
--
-- Register as [ ] in database_updates_master.sql. Do not mark [x].

ALTER TABLE "Job" ALTER COLUMN "followUpAt" DROP NOT NULL;
