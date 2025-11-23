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
WHERE stripe_subscription_id LIKE 'sub_%';

-- 2. 清理测试订阅数据（将测试订阅 ID 设为 NULL）
UPDATE teams
SET
  stripe_subscription_id = NULL,
  subscription_status = 'inactive'
WHERE stripe_subscription_id LIKE 'sub_%'
  AND stripe_subscription_id NOT IN (
    -- 这里可以添加您真实的生产订阅 ID（如果有的话）
    -- 'sub_production_id_1',
    -- 'sub_production_id_2'
  );

-- 3. 验证清理结果
SELECT
  id,
  name,
  stripe_subscription_id,
  stripe_customer_id,
  plan_name,
  subscription_status
FROM teams
WHERE stripe_subscription_id IS NOT NULL;
