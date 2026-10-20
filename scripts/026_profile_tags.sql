-- 026_profile_tags.sql
--
-- Profile skills are tags. Copy any saved profile labels onto the tag
-- catalog, link them to the profile, then drop flavors and profile labels.
--
-- Register as [ ] in database_updates_master.sql. Do not mark [x].

CREATE TABLE IF NOT EXISTS "ProfileTag" (
    "profileId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "ProfileTag_pkey" PRIMARY KEY ("profileId", "tagId")
);

CREATE INDEX IF NOT EXISTS "ProfileTag_tagId_idx" ON "ProfileTag"("tagId");

DO $$ BEGIN
    ALTER TABLE "ProfileTag" ADD CONSTRAINT "ProfileTag_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ProfileTag" ADD CONSTRAINT "ProfileTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
DECLARE
    rec RECORD;
    profile_id TEXT;
    tag_id TEXT;
    used_colors "TagColor"[];
    next_color "TagColor";
    palette "TagColor"[] := ARRAY[
        'red', 'rose', 'pink', 'fuchsia', 'purple', 'violet', 'indigo', 'blue',
        'sky', 'cyan', 'teal', 'emerald', 'green', 'lime', 'yellow', 'amber', 'orange'
    ]::"TagColor"[];
    swatch "TagColor";
BEGIN
    IF to_regclass('public."ProfileLabel"') IS NULL THEN
        RETURN;
    END IF;

    FOR rec IN
        SELECT DISTINCT ON ("userId", lower(btrim("name")))
            "userId",
            btrim("name") AS name
        FROM "ProfileLabel"
        WHERE btrim("name") <> ''
        ORDER BY "userId", lower(btrim("name")), "name"
    LOOP
        SELECT "id" INTO profile_id FROM "Profile" WHERE "userId" = rec."userId";
        IF profile_id IS NULL THEN
            profile_id := gen_random_uuid()::text;
            INSERT INTO "Profile" ("id", "userId", "headline", "aboutEn", "aboutHe")
            VALUES (profile_id, rec."userId", '', '', '');
        END IF;

        SELECT "id" INTO tag_id
        FROM "Tag"
        WHERE "userId" = rec."userId" AND lower(btrim("name")) = lower(rec.name)
        LIMIT 1;

        IF tag_id IS NULL THEN
            SELECT array_agg("color") INTO used_colors FROM "Tag" WHERE "userId" = rec."userId";
            next_color := NULL;
            FOREACH swatch IN ARRAY palette LOOP
                IF used_colors IS NULL OR NOT (swatch = ANY (used_colors)) THEN
                    next_color := swatch;
                    EXIT;
                END IF;
            END LOOP;
            IF next_color IS NULL THEN
                next_color := 'red';
            END IF;
            tag_id := gen_random_uuid()::text;
            INSERT INTO "Tag" ("id", "userId", "name", "color")
            VALUES (tag_id, rec."userId", rec.name, next_color);
        END IF;

        INSERT INTO "ProfileTag" ("profileId", "tagId")
        VALUES (profile_id, tag_id)
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

DROP TABLE IF EXISTS "FlavorLabel";
DROP TABLE IF EXISTS "FlavorBullet";
DROP TABLE IF EXISTS "FlavorEmployment";
DROP TABLE IF EXISTS "Flavor";
DROP TABLE IF EXISTS "ProfileLabel";
DROP TYPE IF EXISTS "ProfileLabelKind";
