-- 将已用 source 标记的试用素材改为 type='trial'
UPDATE "assets" SET type = 'trial' WHERE source = 'trial';

-- 移除 assets.source，改用 type 区分
ALTER TABLE "assets" DROP COLUMN "source";
