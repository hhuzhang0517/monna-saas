-- Supabase 统一数据库架构
-- 将所有表迁移到 Supabase，利用其认证系统

-- 1. 扩展现有的 auth.users 表（通过 profiles 表）
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100),
  gender VARCHAR(20) DEFAULT 'not_specified',
  role VARCHAR(20) NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- 2. 团队管理表
CREATE TABLE IF NOT EXISTS public.teams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Stripe 集成
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_product_id TEXT,
  plan_name VARCHAR(50) DEFAULT 'free',
  subscription_status VARCHAR(20),
  
  -- 信用点系统
  credits INTEGER NOT NULL DEFAULT 20,
  total_credits INTEGER NOT NULL DEFAULT 20,
  credits_consumed INTEGER NOT NULL DEFAULT 0,
  last_credit_update TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 团队成员关系表
CREATE TABLE IF NOT EXISTS public.team_members (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, team_id)
);

-- 4. 更新现有的 jobs 表，添加信用点消耗字段
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS credits_consumed INTEGER DEFAULT 0;

-- 5. 信用点交易记录表
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('charge', 'consume', 'refund', 'bonus')),
  amount INTEGER NOT NULL,
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reason TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 活动日志表
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  metadata JSONB
);

-- 7. 邀请表
CREATE TABLE IF NOT EXISTS public.invitations (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled'))
);

-- 8. 创建索引优化性能
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_team_id ON public.credit_transactions(team_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_team_id ON public.activity_logs(team_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON public.activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON public.jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs(created_at DESC);

-- 9. Row Level Security (RLS) 策略
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Profiles 策略：用户只能访问自己的资料
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Teams 策略：只有团队成员可以访问团队信息
CREATE POLICY "Team members can view team" ON public.teams
  FOR SELECT USING (
    id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid()
    )
  );

-- Team Members 策略：只能查看自己所在的团队成员
CREATE POLICY "View team members" ON public.team_members
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid()
    )
  );

-- Credit Transactions 策略：只能查看自己团队的交易记录
CREATE POLICY "View team credit transactions" ON public.credit_transactions
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid()
    )
  );

-- Jobs 策略：用户只能访问自己的作业
CREATE POLICY "Users can view own jobs" ON public.jobs
  FOR ALL USING (user_id = auth.uid());

-- 10. 触发器：自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teams_updated_at 
  BEFORE UPDATE ON public.teams 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11. 函数：为新用户自动创建 profile 和默认团队
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_team_id INTEGER;
BEGIN
  -- 创建用户 profile
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  
  -- 创建默认团队
  INSERT INTO public.teams (name, credits, total_credits, plan_name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)) || '''s Team', 20, 20, 'free')
  RETURNING id INTO new_team_id;
  
  -- 将用户添加为团队所有者
  INSERT INTO public.team_members (user_id, team_id, role)
  VALUES (NEW.id, new_team_id, 'owner');
  
  -- 记录初始信用点
  INSERT INTO public.credit_transactions (team_id, user_id, type, amount, balance_before, balance_after, reason)
  VALUES (new_team_id, NEW.id, 'charge', 20, 0, 20, '新用户注册获得免费信用点');
  
  RETURN NEW;
END;
$$ language plpgsql security definer;

-- 创建触发器：用户注册时自动执行
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 12. 视图：简化常用查询
CREATE OR REPLACE VIEW public.user_teams AS
SELECT 
  tm.user_id,
  t.*,
  tm.role as user_role,
  tm.joined_at
FROM public.teams t
JOIN public.team_members tm ON t.id = tm.team_id;

-- 13. 函数：获取用户的当前团队
CREATE OR REPLACE FUNCTION public.get_user_team(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE (
  id INTEGER,
  name VARCHAR,
  plan_name VARCHAR,
  credits INTEGER,
  subscription_status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.name, t.plan_name, t.credits, t.subscription_status
  FROM public.teams t
  JOIN public.team_members tm ON t.id = tm.team_id
  WHERE tm.user_id = user_uuid
  LIMIT 1;
END;
$$ language plpgsql security definer;
