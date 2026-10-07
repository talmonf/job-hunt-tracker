-- 025_clear_stale_follow_ups.sql
--
-- Clear follow-up dates that a finished status or a later update already answered.
-- The follow-up note stays. Offer, on hold, and parked keep a date that is still ahead of every update.
--
-- Register as [ ] in database_updates_master.sql. Do not mark [x].

UPDATE "Job" AS job
SET "followUpAt" = NULL,
    "followUpReminderSentAt" = NULL
WHERE job."followUpAt" IS NOT NULL
  AND (
    job.status IN ('rejected', 'not_applicable', 'withdrawn')
    OR EXISTS (
      SELECT 1
      FROM "Event" AS event
      WHERE event."jobId" = job.id
        AND event.type IN ('outreach', 'application', 'meeting', 'status_change')
        AND (
          CASE
            WHEN event.type = 'meeting' THEN COALESCE(event."startsAt", event."occurredAt")
            ELSE event."occurredAt"
          END
        ) >= job."followUpAt"
    )
  );
