-- 010_tag_colors.sql
--
-- More tag colors for the settings palette. Existing tags keep their color.
--
-- Register as [ ] in database_updates_master.sql. Do not mark [x].

ALTER TYPE "TagColor" ADD VALUE IF NOT EXISTS 'red';
ALTER TYPE "TagColor" ADD VALUE IF NOT EXISTS 'pink';
ALTER TYPE "TagColor" ADD VALUE IF NOT EXISTS 'purple';
ALTER TYPE "TagColor" ADD VALUE IF NOT EXISTS 'indigo';
ALTER TYPE "TagColor" ADD VALUE IF NOT EXISTS 'blue';
ALTER TYPE "TagColor" ADD VALUE IF NOT EXISTS 'teal';
ALTER TYPE "TagColor" ADD VALUE IF NOT EXISTS 'green';
ALTER TYPE "TagColor" ADD VALUE IF NOT EXISTS 'lime';
ALTER TYPE "TagColor" ADD VALUE IF NOT EXISTS 'yellow';
