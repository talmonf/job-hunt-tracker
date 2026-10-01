-- 011_contact_names.sql
--
-- Store first and last name on contacts. fullName stays the display name.
-- Existing rows are split on the first space. Later edits are left alone.
--
-- Register as [ ] in database_updates_master.sql. Do not mark [x].

ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "firstName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "lastName" TEXT NOT NULL DEFAULT '';

UPDATE "Contact"
SET
  "firstName" = CASE
    WHEN strpos(btrim("fullName"), ' ') = 0 THEN btrim("fullName")
    ELSE split_part(btrim("fullName"), ' ', 1)
  END,
  "lastName" = CASE
    WHEN strpos(btrim("fullName"), ' ') = 0 THEN ''
    ELSE btrim(substr(btrim("fullName"), strpos(btrim("fullName"), ' ') + 1))
  END
WHERE "firstName" = '' AND "lastName" = '' AND btrim("fullName") <> '';
