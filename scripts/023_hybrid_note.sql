-- 023_hybrid_note.sql
--
-- A short description of a hybrid work arrangement, shown with Hybrid.
--
-- Register as [ ] in database_updates_master.sql. Do not mark [x].

ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "hybridNote" TEXT NOT NULL DEFAULT '';
