-- 添加超级管理员角色支持
-- 为 profiles 表添加 super_admin 角色

-- 1. 更新 profiles 表的 role 字段，添加 super_admin 角色
-- 注意：如果已有的 role 字段支持任意 VARCHAR，则无需更改
-- 这里只是文档说明，确保 role 字段可以存储 'super_admin'

-- 2. 创建函数：检查用户是否为超级管理员
CREATE OR REPLACE FUNCTION public.is_super_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_uuid AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 更新 community_shares 的 RLS 策略，允许超级管理员删除任何分享
-- 删除旧的删除策略
DROP POLICY IF EXISTS "Users can delete own shares" ON public.community_shares;

-- 创建新的删除策略：用户可以删除自己的分享，或超级管理员可以删除任何分享
CREATE POLICY "Users or admins can delete shares" ON public.community_shares
  FOR DELETE USING (
    user_id = auth.uid() OR
    public.is_super_admin(auth.uid())
  );

-- 4. 设置超级管理员
-- 将指定用户设置为超级管理员
UPDATE public.profiles SET role = 'super_admin' WHERE email = 'kongfu0812@icloud.com';

-- 5. 验证设置是否成功
-- 执行以下查询来验证超级管理员是否设置成功
SELECT id, email, name, role, created_at 
FROM public.profiles 
WHERE role = 'super_admin';
