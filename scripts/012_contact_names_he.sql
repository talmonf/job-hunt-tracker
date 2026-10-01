-- 012_contact_names_he.sql
--
-- Hebrew first and last name, beside the English columns.
-- A name that is Hebrew and not Latin moves out of the English column.
-- Mixed names stay where they are.
--
-- Register as [ ] in database_updates_master.sql. Do not mark [x].

ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "firstNameHe" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "lastNameHe" TEXT NOT NULL DEFAULT '';

UPDATE "Contact"
SET
  "firstNameHe" = "firstName",
  "firstName" = ''
WHERE "firstNameHe" = ''
  AND "firstName" ~ '[א-ת]'
  AND "firstName" !~ '[A-Za-z]';

UPDATE "Contact"
SET
  "lastNameHe" = "lastName",
  "lastName" = ''
WHERE "lastNameHe" = ''
  AND "lastName" ~ '[א-ת]'
  AND "lastName" !~ '[A-Za-z]';
