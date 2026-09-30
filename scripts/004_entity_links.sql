-- 004_entity_links.sql
--
-- People and URL refs on jobs, notes, and networking contacts, plus
-- Google Contacts OAuth tokens and a LinkedIn URL on Contact.
--
-- Register as [ ] in database_updates_master.sql. Do not mark [x].

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "contactsRefreshToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "contactsEmail" TEXT;

ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "linkedinUrl" TEXT NOT NULL DEFAULT '';

DO $$ BEGIN
    CREATE TYPE "EntityLinkKind" AS ENUM ('google_contact', 'linkedin', 'url', 'local_contact');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "EntityLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "EntityLinkKind" NOT NULL,
    "displayName" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "googleResourceName" TEXT,
    "url" TEXT NOT NULL DEFAULT '',
    "contactId" TEXT,
    "jobId" TEXT,
    "noteId" TEXT,
    "parentContactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntityLink_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EntityLink_userId_jobId_idx" ON "EntityLink"("userId", "jobId");
CREATE INDEX IF NOT EXISTS "EntityLink_userId_noteId_idx" ON "EntityLink"("userId", "noteId");
CREATE INDEX IF NOT EXISTS "EntityLink_userId_parentContactId_idx" ON "EntityLink"("userId", "parentContactId");

DO $$ BEGIN
    ALTER TABLE "EntityLink" ADD CONSTRAINT "EntityLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "EntityLink" ADD CONSTRAINT "EntityLink_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "EntityLink" ADD CONSTRAINT "EntityLink_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "EntityLink" ADD CONSTRAINT "EntityLink_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "EntityLink" ADD CONSTRAINT "EntityLink_parentContactId_fkey" FOREIGN KEY ("parentContactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
