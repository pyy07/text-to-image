-- Add fields to support image editing (img2img) and source tracking
ALTER TABLE "assets"
ADD COLUMN     "operation" TEXT NOT NULL DEFAULT 'generate',
ADD COLUMN     "sourceAssetId" TEXT,
ADD COLUMN     "inputImageUrl" TEXT;

-- Self-relation: asset -> source asset
ALTER TABLE "assets"
ADD CONSTRAINT "assets_sourceAssetId_fkey"
FOREIGN KEY ("sourceAssetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "assets_sourceAssetId_idx" ON "assets"("sourceAssetId");


