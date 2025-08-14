# 快速修复运行错误

## 问题
缺少 POSTGRES_URL 环境变量导致应用无法启动

## 解决方案

### 方案1：创建 .env.local 文件
在项目根目录创建 `.env.local` 文件，添加以下内容：

```bash
# 临时使用内存数据库（快速测试）
POSTGRES_URL=postgresql://postgres:password@localhost:5432/monna_dev

# 或者使用 SQLite (更简单)
DATABASE_URL=file:./dev.db

# 基础配置 (暂时可以留空)
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
SUPABASE_ANON_KEY=placeholder
SUPABASE_SERVICE_ROLE_KEY=placeholder

# AI 服务 (暂时可以留空)
OPENAI_API_KEY=placeholder
IDEOGRAM_API_KEY=placeholder

# 应用配置
NEXT_PUBLIC_SITE_URL=http://localhost:3000
AUTH_SECRET=your-secret-key-here
```

### 方案2：临时禁用数据库（最快解决）
修改以下文件以跳过数据库连接：

1. 注释掉 `app/layout.tsx` 中的数据库相关导入
2. 或者修改 `lib/db/drizzle.ts` 添加条件检查