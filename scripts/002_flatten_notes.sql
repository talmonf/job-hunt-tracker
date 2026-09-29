ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "bodyEn" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "bodyHe" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "additionalInfo" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "jobId" TEXT;

ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "noteId" TEXT;

DO $$
BEGIN
  IF to_regclass('public.NoteVersion') IS NOT NULL THEN
    UPDATE "Note" AS n
    SET "bodyEn" = v."bodyEn",
        "bodyHe" = v."bodyHe"
    FROM (
      SELECT DISTINCT ON ("noteId") "noteId", "bodyEn", "bodyHe"
      FROM "NoteVersion"
      ORDER BY "noteId", "version" DESC
    ) AS v
    WHERE n.id = v."noteId";

    UPDATE "Event" AS e
    SET "noteId" = nv."noteId"
    FROM "NoteVersion" AS nv
    WHERE e."noteVersionId" IS NOT NULL
      AND e."noteVersionId" = nv.id
      AND e."noteId" IS NULL;
  END IF;
END $$;
