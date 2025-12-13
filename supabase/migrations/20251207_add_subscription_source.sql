-- 添加订阅来源字段
-- 记录订阅是从哪个平台购买的
-- 日期: 2025-12-07

-- 1. 添加subscription_source字段
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS subscription_source VARCHAR(20)
CHECK (subscription_source IN ('web', 'apple', 'google'));

-- 2. 为现有数据设置默认值
-- 如果有stripe_subscription_id，说明是web端订阅
UPDATE public.teams
SET subscription_source = 'web'
WHERE stripe_subscription_id IS NOT NULL
  AND subscription_source IS NULL;

-- 3. 添加注释
COMMENT ON COLUMN public.teams.subscription_source
IS '订阅来源平台: web(Stripe), apple(App Store), google(Google Play)';

-- 4. 创建索引以优化查询
CREATE INDEX IF NOT EXISTS idx_teams_subscription_source
ON public.teams(subscription_source)
WHERE subscription_status = 'active';

-- 5. 添加迁移日志
DO $$
BEGIN
  RAISE NOTICE '✅ 订阅来源字段已添加';
  RAISE NOTICE '   - teams.subscription_source: web/apple/google';
  RAISE NOTICE '   - 支持订阅来源追踪';
  RAISE NOTICE '   - 支持跨渠道订阅检测';
END $$;
