-- 021_work_experience_note.sql
--
-- A note can belong to a profile role, and can be a work experience note.
--
-- Register as [ ] in database_updates_master.sql. Do not mark [x].

ALTER TYPE "NoteType" ADD VALUE IF NOT EXISTS 'work_experience';

ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "employmentId" TEXT;

CREATE INDEX IF NOT EXISTS "Note_employmentId_idx" ON "Note"("employmentId");

DO $$ BEGIN
    ALTER TABLE "Note" ADD CONSTRAINT "Note_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "Employment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
