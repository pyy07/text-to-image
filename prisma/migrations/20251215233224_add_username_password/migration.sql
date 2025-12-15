-- AlterTable: 添加 username 和 password 字段，使 wechatOpenId 可选
-- 这些字段都是可选的，不会影响现有数据

-- 首先，使 wechatOpenId 可以为 NULL（如果之前是 NOT NULL）
ALTER TABLE "users" ALTER COLUMN "wechatOpenId" DROP NOT NULL;

-- 添加 username 字段（可选，唯一索引）
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username") WHERE "username" IS NOT NULL;

-- 添加 password 字段（可选）
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password" TEXT;

