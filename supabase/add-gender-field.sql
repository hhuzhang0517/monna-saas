-- 为 profiles 表添加 gender 字段
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS gender VARCHAR(20) DEFAULT NULL;

-- 添加注释
COMMENT ON COLUMN public.profiles.gender IS '用户性别：male, female, other 或 NULL';
