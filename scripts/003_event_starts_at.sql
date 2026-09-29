-- 003_event_starts_at.sql
--
-- Meetings stored the interview start in occurredAt, so the events log looked
-- as if the meeting had already happened. occurredAt is when the event was
-- logged (when the meeting was scheduled). startsAt is the meeting start.
--
-- Register as [ ] in database_updates_master.sql. Do not mark [x].

ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "startsAt" TIMESTAMP(3);

UPDATE "Event"
SET "startsAt" = "occurredAt",
    "occurredAt" = "createdAt"
WHERE "type" = 'meeting' AND "startsAt" IS NULL;

CREATE INDEX IF NOT EXISTS "Event_userId_startsAt_idx" ON "Event"("userId", "startsAt");
