-- 029_tag_color_hex.sql
--
-- Tag colors become hex strings, so a tag can use a basic swatch or any
-- custom color. Existing tags keep the swatch they already showed.
--
-- Register as [ ] in database_updates_master.sql. Do not mark [x].

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Tag'
          AND column_name = 'color'
          AND udt_name = 'TagColor'
    ) THEN
        ALTER TABLE "Tag" ALTER COLUMN "color" TYPE text USING (
            CASE "color"::text
                WHEN 'red' THEN '#f87171'
                WHEN 'rose' THEN '#fb7185'
                WHEN 'pink' THEN '#f472b6'
                WHEN 'fuchsia' THEN '#e879f9'
                WHEN 'purple' THEN '#c084fc'
                WHEN 'violet' THEN '#a78bfa'
                WHEN 'indigo' THEN '#818cf8'
                WHEN 'blue' THEN '#60a5fa'
                WHEN 'sky' THEN '#38bdf8'
                WHEN 'cyan' THEN '#22d3ee'
                WHEN 'teal' THEN '#2dd4bf'
                WHEN 'emerald' THEN '#34d399'
                WHEN 'green' THEN '#4ade80'
                WHEN 'lime' THEN '#a3e635'
                WHEN 'yellow' THEN '#facc15'
                WHEN 'amber' THEN '#fbbf24'
                WHEN 'orange' THEN '#fb923c'
                ELSE '#ef4444'
            END
        );
    END IF;
END $$;

UPDATE "Tag"
SET "color" = CASE lower("color")
    WHEN 'red' THEN '#f87171'
    WHEN 'rose' THEN '#fb7185'
    WHEN 'pink' THEN '#f472b6'
    WHEN 'fuchsia' THEN '#e879f9'
    WHEN 'purple' THEN '#c084fc'
    WHEN 'violet' THEN '#a78bfa'
    WHEN 'indigo' THEN '#818cf8'
    WHEN 'blue' THEN '#60a5fa'
    WHEN 'sky' THEN '#38bdf8'
    WHEN 'cyan' THEN '#22d3ee'
    WHEN 'teal' THEN '#2dd4bf'
    WHEN 'emerald' THEN '#34d399'
    WHEN 'green' THEN '#4ade80'
    WHEN 'lime' THEN '#a3e635'
    WHEN 'yellow' THEN '#facc15'
    WHEN 'amber' THEN '#fbbf24'
    WHEN 'orange' THEN '#fb923c'
    ELSE "color"
END
WHERE lower("color") IN (
    'red', 'rose', 'pink', 'fuchsia', 'purple', 'violet', 'indigo', 'blue',
    'sky', 'cyan', 'teal', 'emerald', 'green', 'lime', 'yellow', 'amber', 'orange'
);

DROP TYPE IF EXISTS "TagColor";
