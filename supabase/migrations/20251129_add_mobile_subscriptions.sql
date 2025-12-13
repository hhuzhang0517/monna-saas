-- 添加移动端订阅表
-- 支持Apple App Store和Google Play Store订阅

CREATE TABLE IF NOT EXISTS public.mobile_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

  -- 平台和产品信息
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('apple', 'google')),
  product_id VARCHAR(200) NOT NULL,
  plan_name VARCHAR(50) NOT NULL CHECK (plan_name IN ('basic', 'professional', 'enterprise')),

  -- 订阅状态
  status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'expired', 'cancelled', 'in_grace_period',
    'on_hold', 'paused', 'billing_retry'
  )),

  -- 交易标识
  original_transaction_id VARCHAR(500) NOT NULL,  -- Apple: originalTransactionId, Google: orderId
  latest_transaction_id VARCHAR(500) NOT NULL,    -- Apple: transactionId, Google: purchaseToken

  -- 时间信息
  purchase_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_date TIMESTAMP WITH TIME ZONE NOT NULL,

  -- 其他信息
  auto_renewing BOOLEAN NOT NULL DEFAULT TRUE,
  environment VARCHAR(20) NOT NULL DEFAULT 'production' CHECK (environment IN ('sandbox', 'production')),
  metadata JSONB,

  -- 审计字段
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 确保同一用户同一平台的订阅唯一
  UNIQUE(user_id, platform, original_transaction_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_mobile_subscriptions_user_id ON public.mobile_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_mobile_subscriptions_team_id ON public.mobile_subscriptions(team_id);
CREATE INDEX IF NOT EXISTS idx_mobile_subscriptions_status ON public.mobile_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_mobile_subscriptions_expires_date ON public.mobile_subscriptions(expires_date);
CREATE INDEX IF NOT EXISTS idx_mobile_subscriptions_platform ON public.mobile_subscriptions(platform);

-- 启用 Row Level Security
ALTER TABLE public.mobile_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS 策略:用户只能查看自己的订阅
CREATE POLICY "Users can view own mobile subscriptions" ON public.mobile_subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own mobile subscriptions" ON public.mobile_subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own mobile subscriptions" ON public.mobile_subscriptions
  FOR UPDATE USING (user_id = auth.uid());

-- 创建更新时间戳触发器
CREATE OR REPLACE FUNCTION update_mobile_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mobile_subscriptions_updated_at
  BEFORE UPDATE ON public.mobile_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_mobile_subscriptions_updated_at();

-- 添加注释
COMMENT ON TABLE public.mobile_subscriptions IS '移动端应用内订阅记录(Apple App Store和Google Play Store)';
COMMENT ON COLUMN public.mobile_subscriptions.platform IS '订阅平台: apple或google';
COMMENT ON COLUMN public.mobile_subscriptions.product_id IS 'App Store或Play Store的产品ID';
COMMENT ON COLUMN public.mobile_subscriptions.plan_name IS '订阅计划: basic, professional, enterprise';
COMMENT ON COLUMN public.mobile_subscriptions.status IS '订阅状态';
COMMENT ON COLUMN public.mobile_subscriptions.original_transaction_id IS 'Apple的originalTransactionId或Google的orderId';
COMMENT ON COLUMN public.mobile_subscriptions.latest_transaction_id IS 'Apple的transactionId或Google的purchaseToken';
COMMENT ON COLUMN public.mobile_subscriptions.environment IS '环境: sandbox或production';
