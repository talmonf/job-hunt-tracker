-- 024_job_process_steps.sql
--
-- Ordered hiring-process stages for a job: name, medium, who, when, notes, and completion.
--
-- Register as [ ] in database_updates_master.sql. Do not mark [x].

CREATE TABLE IF NOT EXISTS "JobProcessStep" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "medium" TEXT NOT NULL DEFAULT '',
    "withWhom" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobProcessStep_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "JobProcessStep_jobId_position_idx" ON "JobProcessStep"("jobId", "position");

CREATE INDEX IF NOT EXISTS "JobProcessStep_scheduledAt_idx" ON "JobProcessStep"("scheduledAt");

DO $$ BEGIN
    ALTER TABLE "JobProcessStep" ADD CONSTRAINT "JobProcessStep_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
