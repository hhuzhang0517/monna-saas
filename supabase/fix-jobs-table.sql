-- 修复 jobs 表结构，添加缺失的字段
-- 这些字段是 AI 生成任务所需的

-- 添加 provider 字段 (必需)
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS provider VARCHAR(50);

-- 添加参考图片 URL 字段
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS reference_image_url TEXT;

-- 添加第二个参考图片 URL 字段  
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS reference_image_url_2 TEXT;

-- 添加参考视频 URL 字段
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS reference_video_url TEXT;

-- 添加视频时长字段
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS video_duration INTEGER;

-- 添加模型字段
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS model VARCHAR(100);

-- 添加比例字段
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS ratio VARCHAR(20);

-- 更新现有记录的 provider 字段为默认值（如果为 NULL）
UPDATE public.jobs 
SET provider = 'gemini' 
WHERE provider IS NULL;

-- 添加 provider 字段的非空约束（先检查是否为空）
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.jobs WHERE provider IS NULL) THEN
        ALTER TABLE public.jobs ALTER COLUMN provider SET NOT NULL;
    END IF;
END $$;

-- 临时修复：放宽 credit_transactions 表的外键约束
-- 删除现有的外键约束
ALTER TABLE public.credit_transactions 
DROP CONSTRAINT IF EXISTS credit_transactions_job_id_fkey;

-- 重新添加外键约束，但允许延迟检查
ALTER TABLE public.credit_transactions 
ADD CONSTRAINT credit_transactions_job_id_fkey 
FOREIGN KEY (job_id) REFERENCES public.jobs(id) 
ON DELETE SET NULL 
DEFERRABLE INITIALLY DEFERRED;

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_jobs_provider ON public.jobs(provider);
CREATE INDEX IF NOT EXISTS idx_jobs_type_status ON public.jobs(type, status);
