-- 015_note_contact.sql
--
-- A note can belong to a contact, a job, or neither (a general note).
-- Networking and general note types.
--
-- Register as [ ] in database_updates_master.sql. Do not mark [x].

ALTER TYPE "NoteType" ADD VALUE IF NOT EXISTS 'meeting_prep';
ALTER TYPE "NoteType" ADD VALUE IF NOT EXISTS 'meeting_summary';
ALTER TYPE "NoteType" ADD VALUE IF NOT EXISTS 'coffee_chat';
ALTER TYPE "NoteType" ADD VALUE IF NOT EXISTS 'intro_request';
ALTER TYPE "NoteType" ADD VALUE IF NOT EXISTS 'referral';
ALTER TYPE "NoteType" ADD VALUE IF NOT EXISTS 'relationship';
ALTER TYPE "NoteType" ADD VALUE IF NOT EXISTS 'reminder';
ALTER TYPE "NoteType" ADD VALUE IF NOT EXISTS 'idea';
ALTER TYPE "NoteType" ADD VALUE IF NOT EXISTS 'general';

ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "contactId" TEXT;

CREATE INDEX IF NOT EXISTS "Note_contactId_idx" ON "Note"("contactId");

DO $$ BEGIN
    ALTER TABLE "Note" ADD CONSTRAINT "Note_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
