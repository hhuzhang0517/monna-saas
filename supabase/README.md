# 🗄️ Supabase 数据库设置

现在应用已迁移到**单一Supabase架构**，不再使用独立的PostgreSQL数据库。

## 📋 设置步骤

### 1. 创建 Supabase 项目
1. 访问 [supabase.com](https://supabase.com)
2. 创建新项目
3. 获取项目URL和API密钥

### 2. 设置环境变量
在 `.env.local` 文件中添加：

```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe 配置（如果需要支付功能）
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
BASE_URL=http://localhost:3005
```

### 3. 执行数据库迁移

在 Supabase Dashboard 的 SQL Editor 中按顺序执行：

1. **`supabase-unified-schema.sql`** - 创建所有数据表和关系
2. **`supabase-functions.sql`** - 创建数据库函数和触发器

### 4. 配置Row Level Security (RLS)

数据库架构已包含完整的RLS策略，确保：
- 用户只能访问自己的数据
- 团队成员只能访问所属团队的数据
- 自动处理数据权限控制

### 5. 验证设置

启动应用并测试以下功能：

```bash
npm run dev
```

- [ ] 用户注册和登录
- [ ] 自动创建用户profile和团队
- [ ] 信用点系统正常工作
- [ ] 定价页面显示正确
- [ ] API端点正常响应

## 🎯 数据库架构

### 核心表结构：

1. **`auth.users`** - Supabase 内置认证表
2. **`profiles`** - 用户资料扩展
3. **`teams`** - 团队和订阅管理
4. **`team_members`** - 团队成员关系
5. **`jobs`** - AI生成任务
6. **`credit_transactions`** - 信用点交易记录
7. **`activity_logs`** - 活动日志
8. **`invitations`** - 团队邀请

### 自动化功能：

- ✅ 新用户自动创建profile和默认团队
- ✅ 免费用户自动获得20信用点
- ✅ 信用点交易原子操作
- ✅ 自动权限控制 (RLS)
- ✅ 数据库级别的业务逻辑

## 🔧 可用的数据库函数

- `execute_credit_transaction()` - 执行信用点交易
- `get_user_current_team()` - 获取用户当前团队
- `calculate_required_credits()` - 计算所需信用点
- `is_feature_enabled()` - 检查功能可用性
- `allocate_subscription_credits()` - 分配订阅信用点

## 🚨 重要提示

1. **备份**: 在执行SQL之前，确保备份现有数据
2. **测试**: 先在测试环境验证所有功能
3. **RLS**: 不要禁用Row Level Security
4. **函数**: 确保所有数据库函数都有正确的权限

## 🆘 故障排除

### 常见问题：

1. **连接失败**
   - 检查环境变量配置
   - 确认Supabase项目URL正确

2. **权限错误**
   - 确保RLS策略已启用
   - 检查用户是否属于正确的团队

3. **函数错误**
   - 确保`supabase-functions.sql`已执行
   - 检查函数权限设置

4. **数据不一致**
   - 检查外键约束
   - 验证触发器是否正常工作

## 📚 下一步

迁移完成后，您可以：

1. 删除旧的PostgreSQL相关文件
2. 更新部署配置
3. 启用Supabase的实时功能
4. 配置边缘函数（如果需要）
