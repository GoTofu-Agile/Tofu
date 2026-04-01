-- Async persona evaluation backend

DO $$ BEGIN
  CREATE TYPE "PersonaEvaluationStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PersonaClaimStatus" AS ENUM ('SUPPORTED', 'UNSUPPORTED', 'UNCERTAIN', 'SYNTHETIC');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ConfidenceLabel" AS ENUM ('low', 'medium', 'high');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Persona"
  ADD COLUMN IF NOT EXISTS "embeddingJson" JSONB,
  ADD COLUMN IF NOT EXISTS "normalizedText" TEXT,
  ADD COLUMN IF NOT EXISTS "generatedContent" JSONB,
  ADD COLUMN IF NOT EXISTS "rawInput" JSONB,
  ADD COLUMN IF NOT EXISTS "evaluationStatus" "PersonaEvaluationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "evaluationVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "evaluationError" JSONB;

CREATE TABLE IF NOT EXISTS "PersonaEvaluation" (
  "id" TEXT NOT NULL,
  "personaId" TEXT NOT NULL,
  "trustScore" INTEGER NOT NULL,
  "uniquenessScore" INTEGER NOT NULL,
  "factualityScore" INTEGER NOT NULL,
  "consistencyScore" INTEGER NOT NULL,
  "realismScore" INTEGER NOT NULL,
  "verifiabilityScore" INTEGER NOT NULL,
  "confidenceLabel" "ConfidenceLabel" NOT NULL,
  "summary" TEXT,
  "riskFlags" JSONB,
  "evidence" JSONB,
  "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PersonaEvaluation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PersonaClaim" (
  "id" TEXT NOT NULL,
  "personaId" TEXT NOT NULL,
  "claimText" TEXT NOT NULL,
  "claimType" TEXT NOT NULL,
  "status" "PersonaClaimStatus" NOT NULL,
  "confidence" INTEGER,
  "evidence" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PersonaClaim_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SimilarityMatch" (
  "id" TEXT NOT NULL,
  "personaId" TEXT NOT NULL,
  "matchedPersonaId" TEXT NOT NULL,
  "similarityScore" DOUBLE PRECISION NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SimilarityMatch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PersonaEvaluation_personaId_evaluatedAt_idx" ON "PersonaEvaluation"("personaId", "evaluatedAt");
CREATE INDEX IF NOT EXISTS "PersonaClaim_personaId_claimType_idx" ON "PersonaClaim"("personaId", "claimType");
CREATE INDEX IF NOT EXISTS "PersonaClaim_personaId_status_idx" ON "PersonaClaim"("personaId", "status");
CREATE INDEX IF NOT EXISTS "SimilarityMatch_personaId_similarityScore_idx" ON "SimilarityMatch"("personaId", "similarityScore");
CREATE INDEX IF NOT EXISTS "SimilarityMatch_matchedPersonaId_idx" ON "SimilarityMatch"("matchedPersonaId");

DO $$ BEGIN
  ALTER TABLE "PersonaEvaluation"
    ADD CONSTRAINT "PersonaEvaluation_personaId_fkey"
    FOREIGN KEY ("personaId") REFERENCES "Persona"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PersonaClaim"
    ADD CONSTRAINT "PersonaClaim_personaId_fkey"
    FOREIGN KEY ("personaId") REFERENCES "Persona"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "SimilarityMatch"
    ADD CONSTRAINT "SimilarityMatch_personaId_fkey"
    FOREIGN KEY ("personaId") REFERENCES "Persona"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "SimilarityMatch"
    ADD CONSTRAINT "SimilarityMatch_matchedPersonaId_fkey"
    FOREIGN KEY ("matchedPersonaId") REFERENCES "Persona"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
