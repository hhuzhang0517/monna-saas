-- 添加 Monna AI Community 社区分享功能
-- 包含分享表、点赞表及相关策略

-- 1. 创建社区分享表
CREATE TABLE IF NOT EXISTS public.community_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  title VARCHAR(255),
  description TEXT,
  likes_count INTEGER NOT NULL DEFAULT 0,
  views_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(job_id) -- 每个任务只能分享一次
);

-- 2. 创建点赞表
CREATE TABLE IF NOT EXISTS public.community_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  share_id UUID NOT NULL REFERENCES public.community_shares(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(share_id, user_id) -- 每个用户对每个分享只能点赞一次
);

-- 3. 创建索引优化性能
CREATE INDEX IF NOT EXISTS idx_community_shares_user_id ON public.community_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_community_shares_created_at ON public.community_shares(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_shares_likes_count ON public.community_shares(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_community_shares_is_active ON public.community_shares(is_active);
CREATE INDEX IF NOT EXISTS idx_community_likes_share_id ON public.community_likes(share_id);
CREATE INDEX IF NOT EXISTS idx_community_likes_user_id ON public.community_likes(user_id);

-- 4. 启用 Row Level Security (RLS)
ALTER TABLE public.community_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;

-- 5. RLS 策略 - Community Shares
-- 所有认证用户可以查看活跃的分享
CREATE POLICY "Anyone can view active shares" ON public.community_shares
  FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);

-- 用户可以创建自己的分享
CREATE POLICY "Users can create own shares" ON public.community_shares
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 用户可以更新/删除自己的分享
CREATE POLICY "Users can update own shares" ON public.community_shares
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own shares" ON public.community_shares
  FOR DELETE USING (user_id = auth.uid());

-- 6. RLS 策略 - Community Likes
-- 所有认证用户可以查看点赞
CREATE POLICY "Anyone can view likes" ON public.community_likes
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 用户可以创建自己的点赞
CREATE POLICY "Users can create own likes" ON public.community_likes
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 用户可以删除自己的点赞
CREATE POLICY "Users can delete own likes" ON public.community_likes
  FOR DELETE USING (user_id = auth.uid());

-- 7. 触发器：自动更新 updated_at
CREATE TRIGGER update_community_shares_updated_at
  BEFORE UPDATE ON public.community_shares
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. 函数：更新点赞计数
CREATE OR REPLACE FUNCTION public.update_share_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- 增加点赞数
    UPDATE public.community_shares
    SET likes_count = likes_count + 1
    WHERE id = NEW.share_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- 减少点赞数
    UPDATE public.community_shares
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = OLD.share_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. 触发器：点赞时自动更新计数
CREATE TRIGGER update_likes_count_on_insert
  AFTER INSERT ON public.community_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_share_likes_count();

CREATE TRIGGER update_likes_count_on_delete
  AFTER DELETE ON public.community_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_share_likes_count();

-- 10. 函数：增加浏览次数
CREATE OR REPLACE FUNCTION public.increment_share_views(share_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.community_shares
  SET views_count = views_count + 1
  WHERE id = share_uuid AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
