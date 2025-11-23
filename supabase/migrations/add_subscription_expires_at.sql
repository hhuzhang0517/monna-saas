-- 添加一次性支付到期时间字段到 teams 表
-- 用于跟踪通过微信/支付宝进行一次性支付的订阅到期时间

ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;

-- 添加注释说明字段用途
COMMENT ON COLUMN public.teams.subscription_expires_at IS '一次性支付订阅的到期时间，用于微信/支付宝月付功能';

-- 创建索引以优化到期检查查询
CREATE INDEX IF NOT EXISTS idx_teams_subscription_expires_at
ON public.teams(subscription_expires_at)
WHERE subscription_expires_at IS NOT NULL;

-- 为即将到期的订阅创建索引（用于续费提醒）
CREATE INDEX IF NOT EXISTS idx_teams_expiring_soon
ON public.teams(subscription_expires_at, subscription_status)
WHERE subscription_expires_at IS NOT NULL
  AND subscription_status = 'onetime_active';
