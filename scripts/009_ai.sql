-- 009_ai.sql
--
-- Provider keys, credit ledger, profile labels, flavors, and employment bullets.
-- Existing role descriptions are split into one bullet per line.
--
-- Register as [ ] in database_updates_master.sql. Do not mark [x].

DO $$ BEGIN
    CREATE TYPE "AiProvider" AS ENUM ('anthropic', 'google', 'openai', 'openrouter');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AiPaySource" AS ENUM ('key', 'credits');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ProfileLabelKind" AS ENUM ('skill', 'theme');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ImportStatus" AS ENUM ('pending', 'accepted', 'discarded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "aiPaySource" "AiPaySource" NOT NULL DEFAULT 'key';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "creditBalance" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ProfileFile" ADD COLUMN IF NOT EXISTS "extractedText" TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS "AiProviderKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "AiProvider" NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "lastFour" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiProviderKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AiProviderKey_userId_provider_key" ON "AiProviderKey"("userId", "provider");

DO $$ BEGIN
    ALTER TABLE "AiProviderKey" ADD CONSTRAINT "AiProviderKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "AiUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "provider" "AiProvider" NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "paySource" "AiPaySource" NOT NULL,
    "estimatedAgorot" INTEGER NOT NULL,
    "debitAgorot" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AiUsage_userId_createdAt_idx" ON "AiUsage"("userId", "createdAt");

DO $$ BEGIN
    ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "AiPlatform" (
    "id" TEXT NOT NULL,
    "markupPercent" INTEGER NOT NULL DEFAULT 20,
    "usdToIls" DOUBLE PRECISION NOT NULL DEFAULT 3.7,

    CONSTRAINT "AiPlatform_pkey" PRIMARY KEY ("id")
);

INSERT INTO "AiPlatform" ("id", "markupPercent", "usdToIls")
VALUES ('default', 20, 3.7)
ON CONFLICT ("id") DO NOTHING;

CREATE TABLE IF NOT EXISTS "CreditPack" (
    "id" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameHe" TEXT NOT NULL,
    "creditAgorot" INTEGER NOT NULL,
    "priceAgorot" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CreditPack_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CreditLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "stripeSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditLedger_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CreditLedger_stripeSessionId_key" ON "CreditLedger"("stripeSessionId");
CREATE INDEX IF NOT EXISTS "CreditLedger_userId_createdAt_idx" ON "CreditLedger"("userId", "createdAt");

DO $$ BEGIN
    ALTER TABLE "CreditLedger" ADD CONSTRAINT "CreditLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "ProfileLabel" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "ProfileLabelKind" NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ProfileLabel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProfileLabel_userId_kind_name_key" ON "ProfileLabel"("userId", "kind", "name");
CREATE INDEX IF NOT EXISTS "ProfileLabel_userId_idx" ON "ProfileLabel"("userId");

DO $$ BEGIN
    ALTER TABLE "ProfileLabel" ADD CONSTRAINT "ProfileLabel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "EmploymentBullet" (
    "id" TEXT NOT NULL,
    "employmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "textEn" TEXT NOT NULL DEFAULT '',
    "textHe" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "EmploymentBullet_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EmploymentBullet_employmentId_position_idx" ON "EmploymentBullet"("employmentId", "position");

DO $$ BEGIN
    ALTER TABLE "EmploymentBullet" ADD CONSTRAINT "EmploymentBullet_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "Employment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "Flavor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Flavor_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Flavor_userId_idx" ON "Flavor"("userId");

DO $$ BEGIN
    ALTER TABLE "Flavor" ADD CONSTRAINT "Flavor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "FlavorEmployment" (
    "flavorId" TEXT NOT NULL,
    "employmentId" TEXT NOT NULL,

    CONSTRAINT "FlavorEmployment_pkey" PRIMARY KEY ("flavorId", "employmentId")
);

CREATE INDEX IF NOT EXISTS "FlavorEmployment_employmentId_idx" ON "FlavorEmployment"("employmentId");

DO $$ BEGIN
    ALTER TABLE "FlavorEmployment" ADD CONSTRAINT "FlavorEmployment_flavorId_fkey" FOREIGN KEY ("flavorId") REFERENCES "Flavor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "FlavorEmployment" ADD CONSTRAINT "FlavorEmployment_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "Employment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "FlavorBullet" (
    "flavorId" TEXT NOT NULL,
    "bulletId" TEXT NOT NULL,

    CONSTRAINT "FlavorBullet_pkey" PRIMARY KEY ("flavorId", "bulletId")
);

CREATE INDEX IF NOT EXISTS "FlavorBullet_bulletId_idx" ON "FlavorBullet"("bulletId");

DO $$ BEGIN
    ALTER TABLE "FlavorBullet" ADD CONSTRAINT "FlavorBullet_flavorId_fkey" FOREIGN KEY ("flavorId") REFERENCES "Flavor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "FlavorBullet" ADD CONSTRAINT "FlavorBullet_bulletId_fkey" FOREIGN KEY ("bulletId") REFERENCES "EmploymentBullet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "FlavorLabel" (
    "flavorId" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,

    CONSTRAINT "FlavorLabel_pkey" PRIMARY KEY ("flavorId", "labelId")
);

CREATE INDEX IF NOT EXISTS "FlavorLabel_labelId_idx" ON "FlavorLabel"("labelId");

DO $$ BEGIN
    ALTER TABLE "FlavorLabel" ADD CONSTRAINT "FlavorLabel_flavorId_fkey" FOREIGN KEY ("flavorId") REFERENCES "Flavor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "FlavorLabel" ADD CONSTRAINT "FlavorLabel_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "ProfileLabel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "ProfileImport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'pending',
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileImport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProfileImport_userId_status_idx" ON "ProfileImport"("userId", "status");

DO $$ BEGIN
    ALTER TABLE "ProfileImport" ADD CONSTRAINT "ProfileImport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Split existing role descriptions into bullets, once per employment.
DO $$
DECLARE
  emp RECORD;
  en_lines text[];
  he_lines text[];
  n int;
  i int;
BEGIN
  FOR emp IN SELECT id, "userId", "descriptionEn", "descriptionHe" FROM "Employment" LOOP
    IF EXISTS (SELECT 1 FROM "EmploymentBullet" b WHERE b."employmentId" = emp.id) THEN
      CONTINUE;
    END IF;
    en_lines := ARRAY(
      SELECT btrim(x) FROM unnest(regexp_split_to_array(coalesce(emp."descriptionEn", ''), E'[\r\n]+')) AS x WHERE btrim(x) <> ''
    );
    he_lines := ARRAY(
      SELECT btrim(x) FROM unnest(regexp_split_to_array(coalesce(emp."descriptionHe", ''), E'[\r\n]+')) AS x WHERE btrim(x) <> ''
    );
    n := GREATEST(coalesce(array_length(en_lines, 1), 0), coalesce(array_length(he_lines, 1), 0));
    FOR i IN 1..n LOOP
      INSERT INTO "EmploymentBullet" (id, "employmentId", "userId", position, "textEn", "textHe")
      VALUES (
        md5(random()::text || clock_timestamp()::text || emp.id || i::text),
        emp.id,
        emp."userId",
        i - 1,
        coalesce(en_lines[i], ''),
        coalesce(he_lines[i], '')
      );
    END LOOP;
  END LOOP;
END $$;
