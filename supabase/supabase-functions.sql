-- Supabase 数据库函数
-- 支持信用点系统的原子操作

-- 1. 执行信用点交易的原子操作函数
CREATE OR REPLACE FUNCTION public.execute_credit_transaction(
  p_team_id INTEGER,
  p_type TEXT,
  p_amount INTEGER,
  p_reason TEXT,
  p_user_id UUID DEFAULT NULL,
  p_job_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_credits INTEGER;
  new_credits INTEGER;
  transaction_amount INTEGER;
BEGIN
  -- 检查参数
  IF p_team_id IS NULL OR p_type IS NULL OR p_amount IS NULL OR p_reason IS NULL THEN
    RAISE EXCEPTION 'Required parameters cannot be null';
  END IF;
  
  -- 检查交易类型
  IF p_type NOT IN ('charge', 'consume', 'refund', 'bonus') THEN
    RAISE EXCEPTION 'Invalid transaction type: %', p_type;
  END IF;
  
  -- 获取当前信用点余额（加锁）
  SELECT credits INTO current_credits 
  FROM public.teams 
  WHERE id = p_team_id 
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Team not found: %', p_team_id;
  END IF;
  
  -- 计算交易后余额和实际交易金额
  IF p_type IN ('charge', 'refund', 'bonus') THEN
    -- 充值、退款、奖励：增加余额
    new_credits := current_credits + ABS(p_amount);
    transaction_amount := ABS(p_amount);
  ELSIF p_type = 'consume' THEN
    -- 消耗：减少余额
    transaction_amount := -ABS(p_amount);
    new_credits := current_credits + transaction_amount;
    
    -- 检查余额是否足够
    IF new_credits < 0 THEN
      RAISE EXCEPTION 'Insufficient credits. Required: %, Available: %', ABS(p_amount), current_credits;
    END IF;
  END IF;
  
  -- 更新团队信用点
  UPDATE public.teams 
  SET 
    credits = new_credits,
    total_credits = CASE 
      WHEN p_type IN ('charge', 'bonus') THEN total_credits + ABS(p_amount)
      ELSE total_credits
    END,
    credits_consumed = CASE 
      WHEN p_type = 'consume' THEN credits_consumed + ABS(p_amount)
      ELSE credits_consumed
    END,
    last_credit_update = NOW(),
    updated_at = NOW()
  WHERE id = p_team_id;
  
  -- 记录交易
  INSERT INTO public.credit_transactions (
    team_id,
    user_id,
    job_id,
    type,
    amount,
    balance_before,
    balance_after,
    reason,
    metadata
  ) VALUES (
    p_team_id,
    p_user_id,
    p_job_id,
    p_type,
    transaction_amount,
    current_credits,
    new_credits,
    p_reason,
    p_metadata
  );
  
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    -- 记录错误日志
    RAISE LOG 'Credit transaction failed for team %: %', p_team_id, SQLERRM;
    RETURN FALSE;
END;
$$;

-- 2. 获取用户当前团队的函数
CREATE OR REPLACE FUNCTION public.get_user_current_team(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE (
  id INTEGER,
  name VARCHAR,
  plan_name VARCHAR,
  credits INTEGER,
  total_credits INTEGER,
  credits_consumed INTEGER,
  subscription_status VARCHAR,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    t.id,
    t.name,
    t.plan_name,
    t.credits,
    t.total_credits,
    t.credits_consumed,
    t.subscription_status,
    t.stripe_customer_id,
    t.stripe_subscription_id
  FROM public.teams t
  JOIN public.team_members tm ON t.id = tm.team_id
  WHERE tm.user_id = user_uuid
  ORDER BY tm.joined_at ASC
  LIMIT 1;
$$;

-- 3. 计算所需信用点的函数
CREATE OR REPLACE FUNCTION public.calculate_required_credits(
  task_type TEXT,
  plan_name TEXT,
  duration_seconds INTEGER DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  credit_cost INTEGER := 0;
BEGIN
  -- 根据任务类型和计划计算信用点
  CASE 
    WHEN task_type = 'image' THEN
      CASE plan_name
        WHEN 'free', 'basic' THEN credit_cost := 10;
        WHEN 'professional', 'enterprise' THEN credit_cost := 8;
        ELSE credit_cost := 10;
      END CASE;
      
    WHEN task_type = 'video' THEN
      IF plan_name NOT IN ('professional', 'enterprise') THEN
        RAISE EXCEPTION 'Plan % does not support video generation', plan_name;
      END IF;
      
      credit_cost := COALESCE(duration_seconds, 5) * 15; -- 短视频 15 credit/秒
      
    WHEN task_type = 'longvideo' THEN
      IF plan_name NOT IN ('professional', 'enterprise') THEN
        RAISE EXCEPTION 'Plan % does not support long video generation', plan_name;
      END IF;
      
      credit_cost := COALESCE(duration_seconds, 30) * 80; -- 长视频 80 credit/秒
      
    ELSE
      RAISE EXCEPTION 'Invalid task type: %', task_type;
  END CASE;
  
  RETURN credit_cost;
END;
$$;

-- 4. 检查计划是否支持功能的函数
CREATE OR REPLACE FUNCTION public.is_feature_enabled(
  plan_name TEXT,
  feature TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE feature
    WHEN 'image_generation' THEN
      RETURN TRUE; -- 所有计划都支持图片生成
      
    WHEN 'video_generation' THEN
      RETURN plan_name IN ('professional', 'enterprise');
      
    WHEN 'long_video_generation' THEN
      RETURN plan_name = 'enterprise';
      
    WHEN 'api_access' THEN
      RETURN plan_name = 'enterprise';
      
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$;

-- 5. 为新订阅分配信用点的函数
CREATE OR REPLACE FUNCTION public.allocate_subscription_credits(
  p_team_id INTEGER,
  p_plan_name TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  credits_to_add INTEGER;
  plan_display_name TEXT;
BEGIN
  -- 根据计划确定信用点数量
  CASE p_plan_name
    WHEN 'free' THEN 
      credits_to_add := 20;
      plan_display_name := '免费档';
    WHEN 'basic' THEN 
      credits_to_add := 2000;
      plan_display_name := '基础档';
    WHEN 'professional' THEN 
      credits_to_add := 4000;
      plan_display_name := '专业档';
    WHEN 'enterprise' THEN 
      credits_to_add := 10000;
      plan_display_name := '企业档';
    ELSE
      RAISE EXCEPTION 'Invalid plan name: %', p_plan_name;
  END CASE;
  
  -- 执行信用点充值
  RETURN public.execute_credit_transaction(
    p_team_id := p_team_id,
    p_type := 'charge',
    p_amount := credits_to_add,
    p_reason := '订阅' || plan_display_name || '计划获得信用点',
    p_user_id := p_user_id,
    p_job_id := NULL,
    p_metadata := jsonb_build_object('plan_name', p_plan_name, 'credits_allocated', credits_to_add)
  );
END;
$$;

-- 6. 获取团队统计信息的函数
CREATE OR REPLACE FUNCTION public.get_team_stats(p_team_id INTEGER)
RETURNS TABLE (
  total_jobs INTEGER,
  completed_jobs INTEGER,
  failed_jobs INTEGER,
  total_credits_used INTEGER,
  current_credits INTEGER,
  jobs_this_month INTEGER
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    COUNT(*)::INTEGER as total_jobs,
    COUNT(*) FILTER (WHERE status = 'done')::INTEGER as completed_jobs,
    COUNT(*) FILTER (WHERE status = 'failed')::INTEGER as failed_jobs,
    COALESCE(SUM(credits_consumed), 0)::INTEGER as total_credits_used,
    t.credits::INTEGER as current_credits,
    COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE))::INTEGER as jobs_this_month
  FROM public.jobs j
  CROSS JOIN (SELECT credits FROM public.teams WHERE id = p_team_id) t
  WHERE j.user_id IN (
    SELECT tm.user_id 
    FROM public.team_members tm 
    WHERE tm.team_id = p_team_id
  )
  GROUP BY t.credits;
$$;

-- 授权函数执行权限
GRANT EXECUTE ON FUNCTION public.execute_credit_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_current_team TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_required_credits TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_feature_enabled TO authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_subscription_credits TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_stats TO authenticated;
