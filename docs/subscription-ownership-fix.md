# 订阅跨账号共享问题修复指南

## 问题概述

当用户使用同一个Google Play账号（或Apple ID）在不同的应用账号登录时，会出现：
- ❌ 新账号显示"已扣费19.99美元"
- ❌ 同一个订阅可以被多个应用账号共享使用
- ❌ 用户困惑：明明没付费，为什么显示已订阅？

## 根本原因

### 1. 支付账号 ≠ 应用账号

```
Google Play账号 (hhuzhang0517@gmail.com)
    ↓
应用账号A (user_id: abc-123)  ✅ 付费购买订阅
应用账号B (user_id: def-456)  ❌ 未付费，但Google Play认为"已拥有"
```

### 2. RevenueCat的自动归属

RevenueCat在初始化时：
```typescript
Purchases.configure({
  apiKey,
  appUserID: userId, // 当前登录的Supabase User ID
});
```

当用户B登录时：
1. RevenueCat检测到Google Play账号有订阅
2. 自动将订阅归属到用户B的`appUserID`
3. 用户B显示"已订阅"（但实际是用户A付的费）

## 解决方案

### 修复内容

我已经实施了以下修复：

#### 1. 代码层面防护 ✅

在订阅验证时添加归属检查（[lib/mobile-subscriptions/subscription-manager.ts](../lib/mobile-subscriptions/subscription-manager.ts)）：

```typescript
// 检查订阅是否已被其他用户使用
const { data: existingSubscription } = await supabase
  .from('mobile_subscriptions')
  .select('user_id, status, expires_date')
  .eq('platform', 'google')
  .eq('original_transaction_id', verification.orderId)
  .maybeSingle();

// 如果订阅已被其他用户使用且仍然有效
if (existingSubscription && existingSubscription.user_id !== userId) {
  // 拒绝验证，返回错误提示
  return {
    success: false,
    error: '此订阅已绑定到其他账号。如需在当前账号使用，请先在原账号中取消订阅，或使用不同的Google Play账号购买。'
  };
}
```

#### 2. 数据库层面防护 ✅

添加唯一约束（[supabase/migrations/20251207_add_subscription_uniqueness.sql](../supabase/migrations/20251207_add_subscription_uniqueness.sql)）：

```sql
-- 确保同一订阅只能被一个用户使用
ALTER TABLE public.mobile_subscriptions
ADD CONSTRAINT mobile_subscriptions_platform_original_transaction_unique
UNIQUE (platform, original_transaction_id);
```

## 部署步骤

### 1. 运行数据库迁移

在Supabase Dashboard中执行SQL：

```bash
# 方法1: 通过Supabase Dashboard
1. 登录 Supabase Dashboard
2. 进入项目 → SQL Editor
3. 复制并执行 supabase/migrations/20251207_add_subscription_uniqueness.sql
```

或使用Supabase CLI：

```bash
# 方法2: 使用Supabase CLI
supabase db push
```

### 2. 部署代码更新

```bash
# 提交代码
git add .
git commit -m "fix: prevent subscription cross-account sharing"
git push origin feat/ai-providers  # 或你的分支名

# 部署到Vercel（如果使用Vercel）
vercel --prod
```

### 3. 清理现有的重复订阅（如果有）

如果数据库中已经存在重复订阅，需要先清理：

```sql
-- 查找重复订阅
SELECT
  platform,
  original_transaction_id,
  COUNT(*) as count,
  STRING_AGG(user_id::text, ', ') as user_ids
FROM mobile_subscriptions
GROUP BY platform, original_transaction_id
HAVING COUNT(*) > 1;

-- 手动决策保留哪个用户的订阅，删除其他的
-- 建议保留最早创建的记录
DELETE FROM mobile_subscriptions
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY platform, original_transaction_id
        ORDER BY created_at ASC
      ) as rn
    FROM mobile_subscriptions
  ) t
  WHERE rn > 1
);
```

## 用户影响

### 对新购买的影响
- ✅ 用户尝试在新账号使用已绑定的订阅时，会收到清晰的错误提示
- ✅ 提示用户如何正确处理（取消原订阅或使用其他支付账号）

### 对现有订阅的影响
- ✅ 已存在的有效订阅不受影响
- ✅ 如果存在重复订阅，需要手动清理（见上方SQL）

## 测试验证

### 测试场景1：新用户首次购买
```
1. 用户A用Google账号X购买订阅 → ✅ 成功
2. 订阅绑定到用户A → ✅ 正确
3. 用户A可以正常使用订阅 → ✅ 正确
```

### 测试场景2：尝试在新账号使用已绑定的订阅
```
1. 用户A用Google账号X购买订阅 → ✅ 成功
2. 用户B登录应用，尝试用Google账号X购买 → ❌ 拒绝
3. 显示错误："此订阅已绑定到其他账号..." → ✅ 正确
```

### 测试场景3：订阅过期后转移
```
1. 用户A的订阅过期 → ✅ 正常过期
2. 用户B用同一Google账号X购买订阅 → ✅ 允许
3. 订阅绑定到用户B → ✅ 正确
```

## 监控和日志

修复后，关键日志会显示：

```log
# 成功验证
✅ [SubscriptionManager] Google Play subscription synced successfully

# 检测到重复订阅
⚠️ [SubscriptionManager] Subscription already owned by user: xxx-xxx-xxx
❌ [API] Verification failed: 此订阅已绑定到其他账号...

# 允许过期订阅转移
ℹ️ [SubscriptionManager] Existing subscription is expired, allowing transfer
```

## 常见问题

### Q1: 如果用户真的想换账号怎么办？

**答**：用户需要：
1. 在原账号中取消订阅（通过Google Play或App Store）
2. 等待订阅过期
3. 在新账号中重新购买

### Q2: 会影响家庭共享吗？

**答**：不会。家庭共享由Google Play/App Store管理，与应用内账号无关。每个家庭成员仍然使用自己的Google账号/Apple ID登录应用。

### Q3: 现有的重复订阅会自动清理吗？

**答**：不会自动清理。需要运行上面的清理SQL，手动决策保留哪个用户的订阅。建议保留最早创建的记录。

### Q4: 用户看到错误提示后会不会困惑？

**答**：错误提示已经优化，清晰说明原因和解决方案：
```
此订阅已绑定到其他账号。如需在当前账号使用，请先在原账号中取消订阅，或使用不同的Google Play账号购买。
```

## 相关文件

- 代码修复：[lib/mobile-subscriptions/subscription-manager.ts](../lib/mobile-subscriptions/subscription-manager.ts)
- 数据库迁移：[supabase/migrations/20251207_add_subscription_uniqueness.sql](../supabase/migrations/20251207_add_subscription_uniqueness.sql)
- 变更日志：[CHANGELOG.md](../CHANGELOG.md#2025-12-07)

## 技术参考

- [Google Play Billing Best Practices](https://developer.android.com/google/play/billing/security)
- [Apple In-App Purchase Best Practices](https://developer.apple.com/app-store/subscriptions/)
- [RevenueCat User IDs](https://www.revenuecat.com/docs/user-ids)
