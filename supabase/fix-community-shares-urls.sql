-- 修复社区分享表中的URL，将签名URL转换为存储路径
-- 这样可以在读取时动态生成新的签名URL，避免URL过期问题

-- 说明：
-- 旧格式（签名URL）: https://.../storage/v1/object/sign/results/runway/act-two/xxx.mp4?token=...
-- 新格式（纯路径）: runway/act-two/xxx.mp4

-- 创建辅助函数来提取路径
CREATE OR REPLACE FUNCTION extract_storage_path(url TEXT)
RETURNS TEXT AS $$
DECLARE
  extracted_path TEXT;
BEGIN
  -- 如果为空，返回NULL
  IF url IS NULL OR url = '' THEN
    RETURN NULL;
  END IF;

  -- 格式1: .../storage/v1/object/sign/BUCKET/PATH?token=...
  extracted_path := substring(url FROM '/storage/v1/object/sign/[^/]+/([^?]+)');
  IF extracted_path IS NOT NULL THEN
    -- URL解码
    RETURN regexp_replace(extracted_path, '%([0-9A-Fa-f]{2})', '', 'g');
  END IF;

  -- 格式2: .../object/sign/BUCKET/PATH?token=...
  extracted_path := substring(url FROM '/object/sign/[^/]+/([^?]+)');
  IF extracted_path IS NOT NULL THEN
    RETURN regexp_replace(extracted_path, '%([0-9A-Fa-f]{2})', '', 'g');
  END IF;

  -- 格式3: 已经是路径了（不包含http）
  IF url NOT LIKE 'http%' THEN
    RETURN url;
  END IF;

  -- 无法识别的格式，返回原值
  RETURN url;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 更新所有现有的分享记录，将签名URL转换为路径
UPDATE public.community_shares
SET
  video_url = extract_storage_path(video_url),
  thumbnail_url = extract_storage_path(thumbnail_url)
WHERE
  video_url LIKE 'http%' OR thumbnail_url LIKE 'http%';

-- 查看更新结果
SELECT
  id,
  video_url,
  thumbnail_url,
  created_at
FROM public.community_shares
ORDER BY created_at DESC
LIMIT 10;

-- 说明：执行此脚本后，所有旧的签名URL都会被转换为纯存储路径
-- API在读取时会动态生成新的签名URL（有效期7天）
-- 这样可以永久解决URL过期问题
