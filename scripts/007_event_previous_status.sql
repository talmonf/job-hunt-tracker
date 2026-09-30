-- 007_event_previous_status.sql
--
-- A status change made directly on the jobs list records the previous status
-- on the system-created status_change event.
--
-- Register as [ ] in database_updates_master.sql. Do not mark [x].

ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "previousStatus" "JobStatus";
