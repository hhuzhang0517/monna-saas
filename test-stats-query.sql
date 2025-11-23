-- 测试查询：检查本月的 credit_transactions 数据
-- 假设当前是 2025-10-07

SELECT
  ct.id,
  ct.team_id,
  ct.user_id,
  ct.type,
  ct.amount,
  ct.created_at,
  DATE_TRUNC('month', ct.created_at) as month_start
FROM credit_transactions ct
WHERE ct.type = 'consume'
  AND ct.created_at >= '2025-10-01T00:00:00.000Z'
ORDER BY ct.created_at DESC
LIMIT 10;

-- 检查所有的 consume 类型交易
SELECT
  ct.id,
  ct.team_id,
  ct.type,
  ct.amount,
  ct.created_at
FROM credit_transactions ct
WHERE ct.type = 'consume'
ORDER BY ct.created_at DESC
LIMIT 20;
