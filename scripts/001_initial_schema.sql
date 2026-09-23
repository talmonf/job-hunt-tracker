-- 001_initial_schema.sql
--
-- Initial job-hunt tracker schema. Matches prisma/schema.prisma.
-- Ids are text because the app generates them. "updatedAt" has no database
-- default; the app sets it on insert and update.
--
-- ProfileFile and JobCv do not store file bytes or a public URL. objectKey is
-- the key of a private object in the S3 bucket named by S3_BUCKET. The app
-- checks the signed-in user before it reads or deletes that object.
--
-- Register as [ ] in database_updates_master.sql; do not mark [x].

BEGIN;

CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "Role" AS ENUM ('user', 'admin');

CREATE TYPE "UiLanguage" AS ENUM ('en', 'he');

CREATE TYPE "JobStatus" AS ENUM ('interest', 'contacted', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn', 'on_hold');

CREATE TYPE "EventType" AS ENUM ('interest', 'outreach', 'application', 'meeting', 'status_change');

CREATE TYPE "Channel" AS ENUM ('email', 'whatsapp', 'linkedin_inmail', 'phone', 'video', 'in_person', 'other');

CREATE TYPE "MeetingStage" AS ENUM ('hr', 'manager', 'technical', 'final', 'other');

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "fullName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'user',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "passwordChangedAt" TIMESTAMP(3),
    "uiLanguage" "UiLanguage" NOT NULL DEFAULT 'en',
    "googleAccountId" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Jerusalem',
    "digestEnabled" BOOLEAN NOT NULL DEFAULT false,
    "digestDaysAhead" INTEGER NOT NULL DEFAULT 7,
    "digestHour" INTEGER NOT NULL DEFAULT 8,
    "lastDigestLocalDate" TEXT,
    "calendarRefreshToken" TEXT,
    "calendarEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserGoals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationsPerDay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "networkingPerDay" DOUBLE PRECISION,
    "networkingPerWeek" DOUBLE PRECISION,
    "interviewPracticeMinutesPerDay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "learningMinutesPerDay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "searchMinutesOverride" DOUBLE PRECISION,

    CONSTRAINT "UserGoals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "headline" TEXT NOT NULL DEFAULT '',
    "aboutEn" TEXT NOT NULL DEFAULT '',
    "aboutHe" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Employment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "descriptionHe" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Employment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Education" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "degree" TEXT NOT NULL DEFAULT '',
    "field" TEXT NOT NULL DEFAULT '',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),

    CONSTRAINT "Education_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VolunteerRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "descriptionHe" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "VolunteerRole_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT NOT NULL DEFAULT '',
    "issuedOn" TIMESTAMP(3),
    "url" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProfileFile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "interestDate" TIMESTAMP(3) NOT NULL,
    "followUpAt" TIMESTAMP(3) NOT NULL,
    "reminderLeadDays" INTEGER,
    "reminderLeadHours" INTEGER,
    "followUpReminderSentAt" TIMESTAMP(3),
    "status" "JobStatus" NOT NULL DEFAULT 'interest',
    "importKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JobUrl" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "JobUrl_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JobCv" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobCv_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '',
    "workplace" TEXT NOT NULL DEFAULT '',
    "howWeMet" TEXT NOT NULL DEFAULT '',
    "lastChannel" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL DEFAULT '',
    "contactedAt" TIMESTAMP(3),
    "nextActionDate" TIMESTAMP(3),
    "nextAction" TEXT NOT NULL DEFAULT '',
    "contactDetails" TEXT NOT NULL DEFAULT '',
    "willingToRecommend" BOOLEAN NOT NULL DEFAULT false,
    "googleResourceName" TEXT,
    "importKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NoteVersion" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "bodyEn" TEXT NOT NULL DEFAULT '',
    "bodyHe" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoteVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "jobId" TEXT,
    "contactId" TEXT,
    "channel" "Channel",
    "counterpartyName" TEXT NOT NULL DEFAULT '',
    "stage" "MeetingStage",
    "resultingStatus" "JobStatus",
    "summary" TEXT NOT NULL DEFAULT '',
    "noteVersionId" TEXT,
    "cvId" TEXT,
    "tailoredCv" BOOLEAN,
    "googleCalendarEventId" TEXT,
    "googleCalendarHtmlLink" TEXT,
    "importKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "emailed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailedAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE UNIQUE INDEX "User_googleAccountId_key" ON "User"("googleAccountId");

CREATE UNIQUE INDEX "UserGoals_userId_key" ON "UserGoals"("userId");

CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

CREATE INDEX "Job_userId_status_idx" ON "Job"("userId", "status");

CREATE UNIQUE INDEX "Job_userId_importKey_key" ON "Job"("userId", "importKey");

CREATE INDEX "Contact_userId_fullName_idx" ON "Contact"("userId", "fullName");

CREATE UNIQUE INDEX "Contact_userId_importKey_key" ON "Contact"("userId", "importKey");

CREATE UNIQUE INDEX "NoteVersion_noteId_version_key" ON "NoteVersion"("noteId", "version");

CREATE INDEX "Event_userId_occurredAt_idx" ON "Event"("userId", "occurredAt");

CREATE INDEX "Event_jobId_occurredAt_idx" ON "Event"("jobId", "occurredAt");

CREATE UNIQUE INDEX "Event_userId_importKey_key" ON "Event"("userId", "importKey");

CREATE UNIQUE INDEX "Notification_userId_dedupeKey_key" ON "Notification"("userId", "dedupeKey");

ALTER TABLE "UserGoals" ADD CONSTRAINT "UserGoals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Employment" ADD CONSTRAINT "Employment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Education" ADD CONSTRAINT "Education_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VolunteerRole" ADD CONSTRAINT "VolunteerRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProfileFile" ADD CONSTRAINT "ProfileFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Job" ADD CONSTRAINT "Job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JobUrl" ADD CONSTRAINT "JobUrl_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JobCv" ADD CONSTRAINT "JobCv_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Contact" ADD CONSTRAINT "Contact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Note" ADD CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NoteVersion" ADD CONSTRAINT "NoteVersion_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Event" ADD CONSTRAINT "Event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Event" ADD CONSTRAINT "Event_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Event" ADD CONSTRAINT "Event_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Event" ADD CONSTRAINT "Event_noteVersionId_fkey" FOREIGN KEY ("noteVersionId") REFERENCES "NoteVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Event" ADD CONSTRAINT "Event_cvId_fkey" FOREIGN KEY ("cvId") REFERENCES "JobCv"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
