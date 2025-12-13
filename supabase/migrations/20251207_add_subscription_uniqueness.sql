-- 添加订阅唯一性约束
-- 防止同一个订阅（同一交易ID）被多个用户使用
-- 日期: 2025-12-07

-- 1. 首先删除旧的约束（仅限user_id+platform+original_transaction_id）
ALTER TABLE public.mobile_subscriptions
DROP CONSTRAINT IF EXISTS mobile_subscriptions_user_id_platform_original_transaction_id_key;

-- 2. 添加新的全局唯一约束：同一平台的同一订阅只能存在一次
-- 这样可以防止不同用户使用同一个Google Play或Apple订阅
ALTER TABLE public.mobile_subscriptions
ADD CONSTRAINT mobile_subscriptions_platform_original_transaction_unique
UNIQUE (platform, original_transaction_id);

-- 3. 添加注释说明
COMMENT ON CONSTRAINT mobile_subscriptions_platform_original_transaction_unique
ON public.mobile_subscriptions
IS '确保同一平台的同一订阅（通过original_transaction_id标识）只能被一个用户使用，防止订阅跨账号共享';

-- 4. 添加迁移日志
DO $$
BEGIN
  RAISE NOTICE '✅ 订阅唯一性约束已添加';
  RAISE NOTICE '   - 同一Google Play或Apple订阅只能绑定到一个用户';
  RAISE NOTICE '   - 防止用户使用同一支付账号在不同应用账号激活订阅';
END $$;
