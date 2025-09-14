# Monna-SaaS

## 项目概览

这是一个开箱即用的 AI 图片/视频生成 SaaS 模板。  
支持：Next.js App-Router + Supabase（Auth、Storage）+ Stripe 订阅 + Inngest 异步任务编排 + 多家 AI 提供商（OpenAI / Gemini / Ideogram） + CDN 加速。

用户在 Web 或原生 App 上发起生成请求 → 后端鉴权后触发 Inngest 异步任务 → 调第三方 API 生成 → 存储到 Supabase Storage（Smart CDN） → 更新任务状态并返回给前端。


## 功能说明
AI图片和视频生成SaaS

## 1) 对外输入/输出接口（面向 Web 与原生 App）
## A. 认证与会话
*OAuth2 授权端点（/oauth/ 或第三方托管）**：
原生 App 使用外部浏览器 + Deep Link/自定义 URL Scheme 回跳，并强制 PKCE；这是 IETF 对“原生应用 OAuth”的最佳实践（RFC 8252）。
会话/用户端点：GET /api/me、POST /api/auth/logout 等；返回用户资料、权限与订阅状态

## B. 计费与钱包

Web 订阅：POST /api/billing/checkout（Stripe Checkout/Portal URL）。

移动端钱包支付（PaymentSheet）：

POST /api/billing/payment-intent → 返回 client_secret，在 iOS/Android 端用 Stripe PaymentSheet（Apple Pay/Google Pay）完成收款
Webhook（收款事件）：POST /api/webhooks/stripe，必须验签、处理重试、实现幂等

## C. 生成任务 API（Web 与 App 复用）
创建任务：POST /api/jobs（type=image|video, provider=openai|gemini|..., prompt, 可选参数）。
要求客户端或服务端使用幂等键避免重复下单（HTTP 头 Idempotency-Key/自定义键）；做失败安全的重试
查询任务：GET /api/jobs/{id}（status=queued|processing|done|failed, result_url）
流式进度/结果（可选）：
SSE 用于单向事件推送、生成进度；WebSocket用于双向协作/多人编辑。选择标准参考对比文档

## D. 模型提供商接口（出站调用）
OpenAI 图像生成（如 gpt-image-1，支持 URL 或 base64）与编辑/变体接口。
Google Gemini 图像生成/Imagen（含 SynthID 水印 与地区可用性说明）。
这些调用一般由后端 Worker 发起，并设置超时/重试/退避，结果落存储再回写任务表

## E. 文件/媒体
结果下载 URL：返回 签名 URL 或公开 CDN URL（带失效策略与缓存控制）。
上传（若支持用户素材）：POST /api/uploads → 发回直传凭证/签名；客户端直传对象存储，降低后端带宽开销。

## F. 可观测与健康检查
健康探针：GET /healthz。
指标/追踪：导出 OpenTelemetry（trace、metrics、logs）到采集器/后端。

## G. 管理与合规
管理 API：任务重试/取消、配额配置、审计查询。
安全基线：遵循 OWASP API Security Top 10（2023版），覆盖鉴权、授权、资源滥用、速率限制、注入与敏感数据保护等。

## 2) 一级功能模块与功能
## 1、 API 网关 / BFF（Next.js Route Handlers 或任意后端框架）
统一 HTTPS/JSON 接口，鉴权校验、参数校验、幂等键接入、错误规范。
面向 Web 与原生 App 的同一套业务契约；下游调用编排/扇出。
提供 SSE/WebSocket（视场景而定）
## 2、 身份与访问控制（AuthN/AuthZ）
基于 OAuth2/OIDC；原生 App 通过外部浏览器 + Deep Link 回调，启用 PKCE。
会话管理（短期令牌 + 刷新）、角色/租户/资源级权限。

## 3、计费与钱包（Billing）
Stripe Checkout/Portal（Web 端订阅管理）；
移动端用 PaymentSheet 拉起 Apple Pay/Google Pay；
Webhook 事件驱动状态变更（订阅开通/续费/失败），签名校验 + 重试 + 幂等处理。
货币与支付本地化，Checkout/Elements 自动按浏览器语言本地化 UI，并支持 135+ 货币；可用 Adaptive Pricing 自动计算本地价格

## 4、任务编排与工作流（Orchestrator / Workers）
负责把“创建任务 → 调用模型 → 落存储 → 回写状态 → 通知/SSE”串成可靠流水线。
内建：并发控制、速率限制/节流、重试/退避、死信/补偿、定时清理。
可选实现：Inngest/Temporal/Trigger.dev 或云原生队列与定时器（SQS/Cloud Tasks + Cron）

## 5、 模型连接器（Provider Connectors）
对 OpenAI / Gemini 等统一封装：超时、重试、限流、错误映射、审计日志；
图像生成要点：OpenAI 的 Images/GPT-Image-1，Google 的 Gemini/Imagen（含 SynthID 水印）

## 6、 媒体存储与 CDN
对象存储（如 S3/Supabase Storage）保存结果，返回签名 URL；
启用 CDN 与自动失效（例如 Supabase Smart CDN / CloudFront）；设置 Cache-Control、范围请求与大文件分段。

## 7、数据持久层（DB）
任务表：id, user_id, provider, type, status, result_url, created_at...；
账单/额度表：订阅等级、配额、单价、用量；
Webhook 事件幂等表：idempotency_key/事件 event_id 去重（参考 Stripe 做法）。

## 8、Webhook 处理器
Stripe Webhook：校验 Stripe-Signature，5 分钟窗口内验签，幂等更新订阅/发票状态；处理官方重试。
模型/托管方回调（如有）：同样需要验签/白名单、防重放

## 9、速率限制与配额
按 用户/租户/端点 维度限流与计量；防止 资源过度消耗（OWASP API4:2023）。可在网关或工作流层做节流。


## 9、可观测性与审计
全链路 OpenTelemetry：BFF→队列/工作流→连接器→存储；采集 trace、metrics、logs 到 OTel Collector/厂商后端，定位慢查询与失败重试链路。
安全与合规日志：对登录、计费事件、模型调用参数做审计留痕。

## 10、 安全基线
落实 OWASP API Security Top 10 (2023)：对象级授权（BOLA）、鉴权、属性级授权、输入验证、敏感数据保护、SSR 防护、资产清单、资源消耗 等。
传输层：全链路 HTTPS、HSTS、安全响应头；
接口级：幂等键、重放防护、签名校验、分页/排序白名单

## 11、 支持多语言
前端 Web Next.js 内建 i18n 路由（域名或路径前缀）做语言切分与静态/服务端渲染，




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