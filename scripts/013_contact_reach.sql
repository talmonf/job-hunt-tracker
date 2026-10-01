-- 013_contact_reach.sql
--
-- Mobile, email, and a short address on contacts.
--
-- Register as [ ] in database_updates_master.sql. Do not mark [x].

ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "mobile" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "email" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "address" TEXT NOT NULL DEFAULT '';
