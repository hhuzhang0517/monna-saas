-- 清理测试模式的 Stripe 数据
-- 这个脚本将清除数据库中所有测试模式的 Stripe 订阅 ID

-- 1. 查看当前有测试订阅数据的团队
SELECT
  id,
  name,
  stripe_subscription_id,
  stripe_customer_id,
  plan_name,
  subscription_status
FROM teams
WHERE stripe_subscription_id IS NOT NULL;

-- 2. 清理所有 Stripe 订阅数据(将订阅 ID 设为 NULL,状态改为 inactive)
UPDATE teams
SET
  stripe_subscription_id = NULL,
  subscription_status = 'inactive'
WHERE stripe_subscription_id IS NOT NULL;

-- 3. 验证清理结果(应该返回空结果)
SELECT
  id,
  name,
  stripe_subscription_id,
  stripe_customer_id,
  plan_name,
  subscription_status
FROM teams
WHERE stripe_subscription_id IS NOT NULL;
