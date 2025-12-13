-- 修改 profiles 表，允许 email 为 NULL，支持手机号登录
-- 日期: 2025-12-08
-- 原因: 支持用户通过手机短信登录，此时用户没有 email

-- 1. 移除 email 字段的 NOT NULL 约束
ALTER TABLE public.profiles
ALTER COLUMN email DROP NOT NULL;

-- 2. 更新约束说明
-- email 字段可以为 NULL（手机登录），但如果有值则必须唯一
-- UNIQUE 约束仍然保留，这样有 email 的用户不会重复

-- 3. 添加检查约束，确保用户至少有 email 或者在 auth.users 中有 phone
-- 这个约束在应用层检查更合适，所以这里只是注释说明
COMMENT ON COLUMN public.profiles.email
IS 'Email地址（可为空，支持手机号登录）。如果用户通过手机号登录，此字段可以为NULL';

-- 4. 添加迁移日志
DO $$
BEGIN
  RAISE NOTICE '✅ profiles 表已更新以支持手机号登录';
  RAISE NOTICE '   - email 字段现在允许为 NULL';
  RAISE NOTICE '   - 支持手机短信登录的用户';
  RAISE NOTICE '   - UNIQUE 约束保留，防止重复 email';
END $$;

