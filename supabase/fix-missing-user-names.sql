-- 修复 profiles 表的 RLS 策略
-- 问题：用户只能查看自己的 profile，无法查看其他用户的 profile
-- 导致社区作品无法显示其他用户的名称

-- 1. 删除旧的只能查看自己profile的策略
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- 2. 创建新策略：允许所有已登录用户查看所有用户的基本信息
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 3. 保留更新策略：用户只能更新自己的资料
-- (这个策略应该已经存在，无需修改)

-- 4. 可选：如果有name为空的用户，填充默认值
UPDATE public.profiles
SET name = split_part(email, '@', 1)
WHERE name IS NULL OR name = '';

-- 5. 验证修复结果
SELECT 
  id, 
  email, 
  name, 
  role,
  created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 20;

