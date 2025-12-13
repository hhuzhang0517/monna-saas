-- 更新社区分享的 RLS 策略，允许所有人（包括未登录用户）查看社区作品
-- 这样可以让社区内容作为公开展示，吸引更多用户

-- 1. 删除旧的 RLS 策略（需要登录才能查看）
DROP POLICY IF EXISTS "Anyone can view active shares" ON public.community_shares;

-- 2. 创建新的 RLS 策略（允许所有人查看活跃的分享）
CREATE POLICY "Public can view active shares" ON public.community_shares
  FOR SELECT USING (is_active = true);

-- 说明：
-- - 移除了 auth.uid() IS NOT NULL 的限制
-- - 现在所有人（包括未登录用户）都可以浏览社区作品
-- - 仍然要求 is_active = true，确保只显示活跃的分享
-- - 点赞、创建、删除分享仍然需要登录

-- 3. 确保点赞表的查看策略也适用于未登录用户（可选）
DROP POLICY IF EXISTS "Anyone can view likes" ON public.community_likes;

CREATE POLICY "Public can view likes" ON public.community_likes
  FOR SELECT USING (true);

-- 说明：允许所有人查看点赞数据（点赞数统计）
