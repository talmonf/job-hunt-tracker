-- 006_job_statuses.sql
--
-- Parked: no progress and no feedback. Hidden from the jobs list unless chosen in the filter.
-- Not applicable: a softer close than rejected, when the role does not fit the requirements.
--
-- Register as [ ] in database_updates_master.sql. Do not mark [x].

ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'parked';
ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'not_applicable';
