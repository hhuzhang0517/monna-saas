# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Monna-SaaS 是一个开箱即用的 AI 图片/视频生成 SaaS 模板，支持 Next.js App Router + Supabase（认证、存储）+ Stripe 订阅 + Inngest 异步任务编排 + 多家 AI 提供商（OpenAI / Gemini / Ideogram）+ CDN 加速。

## Development Commands

```bash
# Development
npm run dev              # Start development server with Turbopack
npm run build           # Build for production
npm start              # Start production server

# Database
npm run db:setup       # Setup database
npm run db:seed        # Seed database with sample data
npm run db:generate    # Generate Drizzle migrations
npm run db:migrate     # Run database migrations
npm run db:studio      # Launch Drizzle Studio (database UI)
```

## Architecture

### Core Stack
- **Frontend**: Next.js 15 with App Router, React 19, TypeScript
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Supabase Auth (Email + OAuth: Google, Apple)
- **Storage**: Supabase Storage with Smart CDN
- **Async Tasks**: Inngest for job orchestration
- **Payments**: Stripe (Checkout for web, PaymentSheet for mobile)
- **Styling**: Tailwind CSS with Radix UI components

### Key Components

#### Authentication Flow
- Uses Supabase Auth with middleware at `lib/supabase/middleware.ts`
- OAuth2 with PKCE for native apps (RFC 8252 best practices)
- Session management with automatic token refresh

#### AI Generation Pipeline
1. User creates job via `POST /api/jobs`
2. Job stored in database with "queued" status
3. **Current**: Synchronous processing for development (直接处理)
4. **Future**: Inngest event `app/generate.requested` triggers async processing
5. Worker function `generateMedia` processes job:
   - Updates status to "processing"
   - Calls appropriate AI provider (OpenAI/Gemini/Ideogram)
   - Stores result in Supabase Storage
   - Updates job status to "done" with result URL

#### Database Schema
- `users`: User profiles with Supabase auth integration (id, auth_id, name, email, role)
- `teams`: Team/organization management with Stripe integration (stripeCustomerId, subscriptionStatus, planName)
- `team_members`: User-team relationships with roles and permissions
- `activity_logs`: Audit trail for security and compliance (action, timestamp, ipAddress)
- `invitations`: Team invitation management with status tracking
- `jobs`: AI generation tasks (id, userId, provider, type, prompt, referenceImageUrl, status, resultUrl)

#### AI Providers
- **OpenAI**: DALL-E 3 with base64 response format for direct storage (`lib/providers/openai.ts`)
- **Gemini**: Google Generative AI integration (`lib/providers/gemini.ts`)
- **Ideogram**: v3.0 API with Image2Image support and temporary URL download (`lib/providers/ideogram.ts`)
  - Supports character_reference_images, style_reference_images
  - Multiple rendering speeds: TURBO, DEFAULT, QUALITY
  - Various style types: AUTO, GENERAL, REALISTIC, DESIGN, FICTION
- **Runway**: Gen-3/4 Turbo API for video generation with text-to-video and image-to-video capabilities (`lib/providers/runway.ts`)
  - Supports both text-to-video and image-to-video generation
  - **Face Swap功能**: 改进的角色实现，支持Act-Two API（预留）和增强的video-to-video备用方案
  - Video duration up to 10 seconds
  - Multiple aspect ratios and models
  - Async task processing with polling mechanism
  - Enhanced error handling and user-friendly messages

#### Security Features
- HSTS, X-Content-Type-Options, and other security headers in `next.config.ts`
- Row Level Security (RLS) for user data isolation
- User-level task isolation in job queries
- Stripe webhook signature verification

### File Structure

- `app/`: Next.js app directory with pages and API routes
- `components/`: Reusable UI components (shadcn/ui based)
- `lib/`: Core utilities and configurations
  - `auth/`: Authentication middleware and utilities
  - `db/`: Database schema, queries, and migrations
  - `providers/`: AI service integrations
  - `supabase/`: Supabase client configurations
  - `payments/`: Stripe integration
- `inngest/`: Async job functions and client
- `public/`: Static assets including Figma design templates

### Environment Variables Required

```bash
# Core
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
POSTGRES_URL=

# AI Providers
OPENAI_API_KEY=
GEMINI_API_KEY=
IDEOGRAM_API_KEY=
RUNWAY_API_KEY=

# Payments
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Background Jobs
INNGEST_EVENT_KEY=
```

## Development Guidelines

### Cursor Rules Integration
The codebase follows specific development patterns defined in `.cursor/rules/monna.mdc`:
- 专业的 SaaS 后端开发，精通 TypeScript、异步任务处理、计费系统
- 精通 Supabase 认证（Email + Google + Apple OAuth）
- 精通 Inngest 任务编排与工作流
- 始终用中文与用户交流
- 全力保证设计按照 README.md 描述的意图进行

### Database Operations
- Use Drizzle ORM for all database operations
- Migrations are stored in `lib/db/migrations/`
- Always use RLS (Row Level Security) for user data protection
- Test database changes with `npm run db:studio`

### AI Provider Integration
- All providers follow the same interface pattern in `lib/providers/`
- Results are automatically stored in Supabase Storage via `lib/storage.ts`
- Concurrency limited to 3 simultaneous jobs via Inngest configuration
- Rate limiting: 30 requests per minute via Inngest throttle settings
- Supports both text-to-image and Image2Image generation (Ideogram)

### Async Job Processing
- Jobs are processed via Inngest functions in `inngest/functions/`
- Each job has status tracking: queued → processing → done/failed
- Automatic retry and error handling built-in
- Job monitoring available via Inngest dashboard

### API Endpoints

#### Job Management
- `POST /api/jobs`: Create new generation job (supports text-to-image, Image2Image, and video generation)
- `GET /api/jobs?id={jobId}`: Get job status and results
- Parameters: `type`, `provider`, `prompt`, `referenceImageUrl` (optional for Image2Image and video)
- `POST /api/upload/image`: Upload reference images for Image2Image generation
- `POST /api/upload/video`: Upload reference videos for video effects generation (MP4 format, ≤10s, ≤64MB)

#### Authentication & User Management
- `GET /api/auth/status`: Check authentication status
- `POST /api/auth/resend-confirmation`: Resend email confirmation
- `GET /api/user`: Get current user profile
- `DELETE /api/user/delete`: Delete user account

#### Payments & Teams
- `POST /api/stripe/checkout`: Create Stripe checkout session
- `POST /api/stripe/webhook`: Handle Stripe webhook events
- `GET /api/team`: Get team information

### Development Notes
- Currently implements synchronous job processing for development (`app/api/jobs/route.ts:52-107`)
- Production deployment should use full Inngest async processing
- Image2Image generation available for Ideogram provider with reference image upload
- Video generation using Runway ML with both text-to-video and image-to-video modes
- **Face Swap角色功能**:
  - 改进的角色实现，优先使用Act-Two API（当可用时）
  - 备用方案使用增强的video-to-video处理，专注于更好的提示词工程
  - 支持角色图片参考和驱动视频输入
  - 更好的错误处理和用户反馈
- Video effects category supports video file upload (MP4, ≤10s, ≤64MB)
- All jobs are user-scoped with proper authorization checks
- Error messages are sanitized to hide technical details from users
- Figma design integration available with template galleries and clickable areas

### Deployment Configuration
- Vercel deployment configured with cron jobs (`vercel.json`)
- PPR (Partial Pre-Rendering) enabled in `next.config.ts`
- Client segment caching enabled for performance

### Testing
Currently no test framework is configured. When adding tests, check README.md for specific testing requirements.