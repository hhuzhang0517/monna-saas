下面是一份专门为你现有项目准备的 **`README.md`** 模板，涵盖了你之前要求的所有功能和结构，包括 AI 生成（OpenAI, Gemini, Ideogram）、任务队列（Inngest）、Supabase 存储与 CDN、OAuth 登录、HTTPS 安全配置等内容。

你可以拿去直接 Copy-Paste 到你的仓库中，适配环境变量即可开箱跑通。

---

````markdown
# Monna-SaaS

## 项目概览

这是一个开箱即用的 AI 图片/视频生成 SaaS 模板。  
支持：Next.js App-Router + Supabase（Auth、Storage）+ Stripe 订阅 + Inngest 异步任务编排 + 多家 AI 提供商（OpenAI / Gemini / Ideogram） + CDN 加速。

用户在 Web 或原生 App 上发起生成请求 → 后端鉴权后触发 Inngest 异步任务 → 调第三方 API 生成 → 存储到 Supabase Storage（Smart CDN） → 更新任务状态并返回给前端。

## 系统架构
## mermaid

flowchart LR
subgraph Clients
  WEB["Web Client"]
  APP["Mobile App iOS Android"]
  ADMIN_SUPER["Admin Console Super"]
  ADMIN_TENANT["Admin Console Tenant"]
end

subgraph API_BFF
  GATE["API Gateway BFF"]
  SSE["SSE or WebSocket Layer"]
end

subgraph Auth_RBAC
  AUTH["Auth Service OAuth OIDC PKCE"]
  RBAC["Authorization RBAC"]
end

subgraph Billing
  BILL["Stripe Billing"]
  WH["Stripe Webhook Receiver"]
end

subgraph Orchestrator
  FLOW["Workflow Orchestrator concurrency throttle retry cron"]
end

subgraph Providers
  OAI["Connector OpenAI"]
  GEM["Connector Gemini"]
  IDEO["Connector Ideogram"]
end

subgraph Analytics
  GA4["Analytics GA4 Google tag"]
  PH["Analytics PostHog events flags experiments"]
end

subgraph Data
  DB["Database Jobs Users Tenants Quotas"]
  STORE["Object Storage Results"]
  CDN["CDN Signed URL"]
end

subgraph Observability_Security
  OTel["OpenTelemetry traces metrics logs"]
  OWASP["OWASP API Security controls"]
  RL["Rate Limit and Quota"]
end

WEB --> GATE
APP --> GATE
ADMIN_SUPER --> GATE
ADMIN_TENANT --> GATE

GATE --> AUTH
GATE --> RBAC
GATE --> BILL
WH --> BILL
WH --> DB

GATE --> SSE
GATE --> FLOW
FLOW --> OAI
FLOW --> GEM
FLOW --> IDEO

FLOW --> STORE
STORE --> CDN
FLOW --> DB
GATE --> DB
GATE --> STORE

GATE --> GA4
GATE --> PH

GATE --> RL
GATE --> OTel
FLOW --> OTel
WH --> OTel


---

## ​ 快速开始（本地开发）

1. 克隆并安装依赖：
   ```bash
   git clone <repo-url>
   cd monna-saas
   pnpm install
````

2. 设置环境变量（`env.local`）：

   ```env
   NEXT_PUBLIC_SITE_URL=https://your-domain.com
   NEXT_PUBLIC_SUPABASE_URL=…
   SUPABASE_ANON_KEY=…
   SUPABASE_SERVICE_ROLE_KEY=…

   OPENAI_API_KEY=…
   GEMINI_API_KEY=…
   IDEOGRAM_API_KEY=…

   INNGEST_EVENT_KEY=  # 可选：如果使用 Inngest 云接入
   ```

3. 确认 Supabase 数据库已执行 migrations（jobs 表）及创建 `results` Storage bucket，并启用 Smart CDN。

4. 运行项目：

   ```bash
   pnpm dev
   ```

5. 本地 HTTPS 支持可选：使用 `ngrok` 或 `Cloudflare Tunnel` 暴露 `https://...` 域名，适配 Deep Link 和 OAuth 登录测试。

---

## 功能说明

### 1. 登录与认证

* 使用 Supabase Auth 实现 Email + Google + Apple OAuth 登录（支持移动端 Deep Link 回调）。
* 核查用户身份后允许发起生成请求。

### 2. Stripe 支付订阅

* 可直接复用之前的 Stripe 付费订阅逻辑。
* 收费后可校验订阅状态，控制生成额度。

### 3. AI 图片生成

* **OpenAI**：文本生图，返回 base64，存储为 PNG → CDN URL。
* **Gemini**：使用 `@google/genai` 生成图像（带 SynthID 水印），同样存储处理。
* **Ideogram**：调用同步 API，获取临时 URL，下载 + 存储 + 生成 CDN URL。

### 4. 异步任务处理：Inngest

* 使用 `inngest` 创建后台任务函数 `generate-media`（带并发/节流/重试控制）处理 AI 请求。
* 支持自动任务调度，失败重试，节流保护（每分钟最多任务等）。
* `cleanup-jobs` 函数由 Cron 每小时自动触发，清理超时／失败任务。

### 5. API 接口（共用 Web 与移动端）

* `POST /api/jobs` → 发起 AI 生成任务，返回任务 ID；
* `GET  /api/jobs?id=...` → 查询任务状态与结果 URL；
* Inngest 统一处理任务生成流程。

### 6. 存储与 CDN

* 所有生成结果存入 Supabase Storage `results` bucket。
* 启用 Smart CDN（签名 URL 也缓存），全球加速访问。

### 7. 安全配置

* 部署到 Vercel 自带 HTTPS + 自动证书；
* `next.config.js` 添加 HSTS、安全响应头；
* 支持自托管部署到 GCP/AWS，且启用 HTTPS 及 CDN（Cloud Run + Cloud CDN / ALB + CloudFront）。

---

## 项目结构（核心文件）

```
/lib
  supabase/server.ts            ← SSR 客户端封装
  storage.ts                    ← 上传 + 签名 URL 逻辑
  providers/
    openai.ts
    gemini.ts
    ideogram.ts

/ingest
  client.ts
  functions/
    generate.ts                ← 主任务逻辑
    cleanup.ts                 ← 定时清理逻辑

/app/api
  jobs/route.ts                 ← 创建 / 查询任务
  inngest/route.ts              ← Inngest HTTP 接口

next.config.js                  ← HSTS & HTTPS 强化
vercel.json                     ← 可选：Cron 任务
```

---

## 环节效率提升建议

* 若需要频繁处理视频生成，建议走外部 API 并落库状态+URL；可以延迟合并到 CDN。
* 若项目走成熟方案，用 Inngest Cloud 管理任务监控与 Dashboard。
* Stripe Portal + Billing Circles 可集成 Web 端订阅控制。

---

## 贡献 & 部署建议

* 部署到 Vercel：基础变量填全 → 一键部署 → Vercel 默认 HTTPS + CDN。
* 自托管（GCP/AWS）：部署后记得配置 HTTPS + CDN + Scheduler 替代 cron。
* 移动端：React Native / Expo 使用 `signInWithOAuth({ provider, redirectTo })` + Stripe PaymentSheet 调起 Apple Pay / Google Pay。

---
