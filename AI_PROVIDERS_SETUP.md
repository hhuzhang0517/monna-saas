# AI 图像生成服务集成指南

## 功能概述

本次集成为 monna-saas 添加了以下功能：

- **三家 AI 图像生成提供商**：OpenAI DALL-E 3、Gemini、Ideogram 3.0
- **任务编排系统**：基于 Inngest 的异步任务处理
- **状态管理**：Supabase 数据库存储任务状态
- **文件存储**：Supabase Storage + Smart CDN 进行图像存储和分发

## 环境变量配置

在 `.env.local` 文件或 Vercel 环境变量中添加：

```bash
# 基础配置
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# AI 服务 API Keys
OPENAI_API_KEY=your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key
IDEOGRAM_API_KEY=your-ideogram-api-key

# Inngest（可选，用云端直接配）
INNGEST_EVENT_KEY=your-inngest-event-key
```

## 数据库设置

1. 在 Supabase 控制台执行 `supabase-schema.sql` 中的 SQL 语句
2. 在 Supabase Storage 中创建名为 `results` 的 bucket
3. 建议开启 Smart CDN 以加速全球访问

## API 使用方式

### 创建图像生成任务

```bash
POST /api/jobs
Content-Type: application/json

{
  "provider": "openai", // "openai" | "gemini" | "ideogram"
  "type": "image",
  "prompt": "A beautiful sunset over mountains"
}
```

响应：
```json
{
  "id": "uuid-of-job",
  "status": "queued"
}
```

### 查询任务状态

```bash
GET /api/jobs?id=uuid-of-job
```

响应：
```json
{
  "id": "uuid-of-job",
  "status": "done", // "queued" | "processing" | "done" | "failed"
  "result_url": "https://signed-url-to-image",
  "created_at": "2024-01-01T00:00:00Z"
}
```

## 部署步骤

1. **推送代码到 GitHub**：
   ```bash
   git add .
   git commit -m "feat: providers(OpenAI/Gemini/Ideogram) + jobs API + Inngest + Supabase Storage"
   git push -u origin feat/ai-providers
   ```

2. **在 Vercel 中配置环境变量**

3. **配置 Inngest**：
   - 访问 [Inngest 控制台](https://app.inngest.com)
   - 添加你的应用并配置 webhook URL: `https://your-domain.com/api/inngest`

4. **测试功能**：
   - 确保所有 API keys 正确配置
   - 测试图像生成 API 端点

## 重要说明

### OpenAI
- 使用 DALL-E 3 模型
- 支持 1024x1024 图像生成
- 返回 base64 格式便于存储

### Gemini
- 当前实现为框架代码
- 需要根据 Google 最新的图像生成 API 进行调整
- 生成的图像带有 SynthID 水印

### Ideogram
- 使用 Ideogram 3.0 API
- 返回临时 URL，系统会自动下载并存储
- 支持各种风格的图像生成

## 安全特性

- 启用了 HSTS、X-Content-Type-Options 等安全头
- 实现了用户级别的任务隔离
- 支持 RLS（行级安全策略）

## 监控和维护

- 定时清理任务：每小时执行一次
- 自动重试机制：Inngest 提供内置重试
- 并发控制：最多同时处理 3 个任务
- 速率限制：每分钟最多 30 个请求

## 故障排除

1. **任务一直处于 queued 状态**：
   - 检查 Inngest webhook 配置
   - 验证环境变量是否正确设置

2. **图像生成失败**：
   - 检查对应 AI 服务的 API key
   - 查看服务端日志获取详细错误信息

3. **存储问题**：
   - 确认 Supabase Storage bucket 已创建
   - 检查 SERVICE_ROLE_KEY 权限

## 下一步

- 添加前端 UI 组件调用这些 API
- 实现用户配额和计费系统
- 添加更多图像生成参数选项
- 集成图像编辑功能