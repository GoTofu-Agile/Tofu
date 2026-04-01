ALTER TABLE "Persona"
  ADD COLUMN IF NOT EXISTS "authenticityScore" INTEGER,
  ADD COLUMN IF NOT EXISTS "authenticityBand" "ConfidenceLabel",
  ADD COLUMN IF NOT EXISTS "evalSummary" TEXT,
  ADD COLUMN IF NOT EXISTS "evalDimensions" JSONB,
  ADD COLUMN IF NOT EXISTS "evalFlags" JSONB,
  ADD COLUMN IF NOT EXISTS "evalVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "evalRaw" JSONB,
  ADD COLUMN IF NOT EXISTS "backstoryEmbeddingJson" JSONB;
