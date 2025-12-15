-- DropIndex
DROP INDEX "assets_sourceAssetId_idx";

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "maxUsage" SET DEFAULT 3;
