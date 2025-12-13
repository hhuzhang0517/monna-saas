# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Monna-SaaS 是一个开箱即用的 AI 图片/视频生成 SaaS 模板，支持 Next.js App Router + Supabase（认证、存储）+ Stripe 订阅 + Inngest 异步任务编排 + 多家 AI 提供商（OpenAI / Gemini / Ideogram / Runway）+ CDN 加速。

这是一个面向 Web 和移动端的生产级 SaaS 架构，支持多租户、多语言、多币种支付，具备完整的可观测性和安全防护。

## Development Commands

```bash
# Development
npm run dev              # Start development server with Turbopack (port 3005)
npm run build           # Build for production
npm run start           # Start production server

# Database Operations
npm run db:setup       # Setup database schema (handled via Supabase Dashboard)
npm run db:types       # Generate TypeScript types from Supabase schema
```

**Important**: The dev server runs on port 3005 with hostname 0.0.0.0 for network access.

## Architecture

### Core Stack
- **Frontend**: Next.js 15 with App Router, React 19, TypeScript
- **Backend**: Next.js API Routes with Server Components
- **Database**: Supabase (unified database with PostgreSQL + built-in auth)
- **Authentication**: Supabase Auth (Email + OAuth: Google, Apple)
- **Storage**: Supabase Storage with Smart CDN
- **Async Tasks**: Inngest for job orchestration and workflow management
- **Payments**: Stripe (Checkout for web, PaymentSheet for mobile)
- **Styling**: Tailwind CSS 4.x with Radix UI components (shadcn/ui)
- **AI Providers**: OpenAI (DALL-E 3), Google Gemini, Ideogram v3.0, Runway ML

### Key Architectural Patterns

#### Clean Architecture Implementation
- **API Gateway/BFF Pattern**: Next.js API routes serve as unified interface for web and mobile
- **Event-Driven Architecture**: Inngest handles async job processing with retry/error handling
- **Provider Pattern**: Standardized interface for AI services (`lib/providers/`)
- **Multi-Tenant Ready**: Team-based organization with Row Level Security (RLS)
- **OAuth2 + PKCE**: RFC 8252 compliant authentication for native apps

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

### Template System

The application features a comprehensive template gallery system for showcasing AI generation capabilities:

#### Template Categories
- **Expression**: Human portrait emotion modification (大笑, 严肃, 微笑, etc.)
- **Artistic**: Photo editing and enhancement (去除痘痕, 摘掉眼镜, 肌肉感, etc.)
- **Anime**: Two-image merging system showing original images → merged result
- **Landscape**: Nature and scenery generation templates
- **Abstract**: Abstract art and design patterns
- **Video Categories**: Effects, Animation, Fantasy, Product showcases

#### Template Data Structure
```typescript
// Image templates with before/after comparison
{ id, image, afterImage, category, prompt }

// Anime templates with dual-source merging layout
{ id, originalImage1, originalImage2, mergedImage, category, prompt }

// Video templates with preview functionality
{ id, thumbnail, video, category, prompt }
```

#### Rendering Logic
- **Expression/Artistic**: Uses `ImageComparisonSlider` for before/after comparison
- **Anime**: Custom layout with two source images on top, merged result below
- **Video**: Hover-to-play preview with thumbnail fallback
- **Others**: Standard single image display

#### Template Assets Location
- Image templates: `/public/figma-designs/{category}/`
- Video templates: `/public/figma-designs/videos/{category}/`
- Organized by category with consistent naming conventions

### File Structure

- `app/`: Next.js app directory with pages and API routes
  - `generate/`: Main AI generation interface with template galleries
  - `(dashboard)/`: Protected dashboard routes with route groups
  - `(login)/`: Authentication pages (sign-in, sign-up)
  - `api/`: RESTful API endpoints for jobs, auth, payments, etc.
- `components/`: Reusable UI components (shadcn/ui based)
  - `ui/`: Core UI primitives (buttons, dialogs, forms)
  - Custom components for image comparison, upload dialogs, etc.
- `lib/`: Core utilities and configurations
  - `auth/`: Authentication middleware and utilities
  - `db/`: Database schema, queries, and migrations
  - `providers/`: AI service integrations (OpenAI, Gemini, Ideogram, Runway)
  - `supabase/`: Supabase client configurations for browser/server
  - `payments/`: Stripe integration and webhook handling
  - `hooks/`: React custom hooks for auth, jobs, etc.
  - `i18n/`: Internationalization and translation utilities
- `inngest/`: Async job functions and client configuration
- `public/`: Static assets including Figma design templates and videos

### Environment Variables Required

```bash
# Core Application
NEXT_PUBLIC_SITE_URL=              # Application base URL
NEXT_PUBLIC_SUPABASE_URL=          # Supabase project URL
SUPABASE_ANON_KEY=                 # Supabase anonymous key
SUPABASE_SERVICE_ROLE_KEY=         # Supabase service role key (server-side)
POSTGRES_URL=                      # PostgreSQL connection string

# AI Providers
OPENAI_API_KEY=                    # OpenAI API key for DALL-E 3
GEMINI_API_KEY=                    # Google Gemini API key
IDEOGRAM_API_KEY=                  # Ideogram API key for image generation
RUNWAY_API_KEY=                    # Runway ML API key for video generation

# Payments & Billing
STRIPE_SECRET_KEY=                 # Stripe secret key
STRIPE_WEBHOOK_SECRET=             # Stripe webhook endpoint secret

# Background Job Processing
INNGEST_EVENT_KEY=                 # Inngest event API key
INNGEST_SIGNING_KEY=              # Inngest webhook signing key (optional)

# Optional Development
NEXT_PUBLIC_INNGEST_DEV=          # Enable Inngest dev mode (development only)
```

**Security Note**: Never commit API keys or secrets to the repository. Use `.env.local` for local development.

## Development Guidelines

### Code Principles
This project follows clean architecture principles with clear separation of concerns:

#### Type Safety & Validation
- **Full TypeScript coverage** with strict mode enabled
- **Zod schemas** for API input/output validation
- **Drizzle ORM** for type-safe database operations
- **Server Components** for better performance and SEO

#### Error Handling & User Experience
- **Sanitized error messages** that hide technical details from users
- **Comprehensive retry logic** for AI provider API calls
- **Graceful fallbacks** for failed operations
- **User-friendly progress indicators** for long-running tasks

#### Security Best Practices
- **Row Level Security (RLS)** for multi-tenant data isolation
- **User-scoped queries** to prevent data leakage
- **Input sanitization** and validation at API boundaries
- **Webhook signature verification** for external integrations
- **Security headers** configured in `next.config.ts`

### Cursor Rules Integration
The codebase follows specific development patterns defined in `.cursor/rules/monna.mdc`:
- 专业的 SaaS 后端开发，精通 TypeScript、异步任务处理、计费系统
- 精通 Supabase 认证（Email + Google + Apple OAuth）
- 精通 Inngest 任务编排与工作流
- 始终用中文与用户交流
- 全力保证设计按照 README.md 描述的意图进行
- 精通多语言框架和国际化支持

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
- `POST /api/jobs`: Create new generation job
  - Supports: text-to-image, Image2Image, video generation (text-to-video, image-to-video)
  - Parameters: `type`, `provider`, `prompt`, `referenceImageUrl`, `referenceVideoUrl`
  - Returns: Job ID for status tracking
- `GET /api/jobs?id={jobId}`: Get job status and results
- `GET /api/jobs/pending`: Get user's pending jobs
- `POST /api/jobs/cleanup`: Cleanup old completed jobs
- `POST /api/jobs/long-video`: Create long video generation job (multi-shot)

#### File Upload & Media
- `POST /api/upload/image`: Upload reference images for Image2Image generation
  - Supports: PNG, JPG, WebP formats
- `POST /api/upload/video`: Upload reference videos for video effects
  - Supports: MP4 format, ≤10s duration, ≤64MB size
- Uploaded files are stored in Supabase Storage with automatic CDN acceleration

#### Authentication & User Management
- `GET /api/auth/status`: Check authentication status
- `POST /api/auth/resend-confirmation`: Resend email confirmation
- `GET /api/user`: Get current user profile
- `DELETE /api/user/delete`: Delete user account with data cleanup
- `GET /api/user/generations`: Get user's generation history
- `GET /api/user/stats`: Get user statistics and usage

#### Payments & Teams
- `POST /api/stripe/checkout`: Create Stripe checkout session
- `POST /api/stripe/webhook`: Handle Stripe webhook events (with signature verification)
- `GET /api/team`: Get team information and subscription status

#### Utilities
- `POST /api/translate`: Translation service endpoint
- `POST /api/inngest`: Inngest webhook endpoint for async job processing

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

### Important Development Patterns

#### AI Provider Integration Pattern
All AI providers follow a consistent interface pattern:
```typescript
// Standard provider interface in lib/providers/
interface AIProvider {
  generateImage(prompt: string, options?: any): Promise<string>
  generateVideo?(prompt: string, options?: any): Promise<string>
}
```

#### Job Processing Workflow
1. **Validation**: Input validation with Zod schemas
2. **Authentication**: User context extraction from Supabase session
3. **Job Creation**: Store job in database with "queued" status
4. **Async Processing**: Inngest triggers background worker
5. **Result Storage**: Generated content stored in Supabase Storage
6. **Status Update**: Job status updated to "done" with result URL

#### Error Handling Strategy
- **User-facing errors**: Generic, helpful messages without technical details
- **Internal logging**: Detailed error information for debugging
- **Retry mechanisms**: Exponential backoff for transient failures
- **Fallback providers**: Automatic failover between AI providers when available

#### Multi-Language Support
- **Internationalization**: Built-in i18n with language context
- **Translation keys**: Organized in `lib/i18n/translations.ts`
- **Dynamic content**: AI-generated content can be translated via `/api/translate`
- **UI localization**: Automatic language detection and switching

### Deployment Configuration
- **Vercel Platform**: Optimized for Next.js with serverless functions
- **Cron Jobs**: Configured in `vercel.json` for periodic cleanup tasks
- **PPR**: Partial Pre-Rendering enabled in `next.config.ts`
- **Edge Runtime**: API routes optimized for edge deployment where applicable
- **Environment**: Production environment variables required for all services

### Performance Optimizations
- **Turbopack**: Enabled for development builds
- **Client Segment Caching**: Enabled for better performance
- **CDN Integration**: Supabase Smart CDN for asset delivery
- **Database Connection Pooling**: Configured via connection string
- **Image Optimization**: Next.js automatic image optimization
- **Bundle Analysis**: Use `npm run build` to analyze bundle size

### Testing
Currently no test framework is configured. When adding tests:
- Consider Vitest for unit tests with TypeScript support
- Use Playwright for E2E testing of critical user flows
- Test database operations with isolated test database
- Mock AI provider calls for consistent testing
- Check README.md for specific testing requirements when framework is added

### SEO Configuration
The application has comprehensive SEO optimization implemented:

#### Core SEO Features
- **Domain Canonicalization**: 301 redirect from `monna.us` to `www.monna.us`
- **Meta Tags**: Optimized title, description, keywords for all pages
- **Structured Data**: Organization, WebSite, SoftwareApplication JSON-LD schemas
- **Sitemap**: Dynamic sitemap at `/sitemap.xml`
- **Robots.txt**: Proper crawl rules at `/robots.txt`
- **Hreflang**: Multi-language support (zh-CN, en-US)
- **Security Headers**: X-Content-Type-Options, X-Frame-Options, etc.

#### SEO Files
- `lib/seo/config.ts` - SEO configuration center
- `lib/seo/structured-data.ts` - Schema generators
- `components/seo/structured-data.tsx` - React component
- `app/sitemap.ts` - Dynamic sitemap
- `app/robots.ts` - Robots.txt
- `scripts/verify-seo.js` - Verification script

#### Verification
Run `node scripts/verify-seo.js` to verify all SEO implementations.

#### Next Steps
1. Verify domain in Google Search Console
2. Submit sitemap: `https://www.monna.us/sitemap.xml`
3. Test with PageSpeed Insights and Rich Results Test

See `CHANGELOG.md` (2025-11-02 section) for detailed SEO implementation notes.

## Documentation Guidelines

**IMPORTANT**: All development changes, features, fixes, and optimizations must be documented in `CHANGELOG.md`. Do NOT create separate markdown files for documentation.

### Core Documentation Files
Only these markdown files should exist in the project root:
- `README.md` - Project overview and setup
- `CLAUDE.md` - This file (Claude Code guidance)
- `CHANGELOG.md` - All development changes and feature documentation
- `LLMScheAgent.md` - Technical architecture for LLM agent
- `SEO_optimism.md` - SEO optimization guidelines
- `supabase-setup.md` - Supabase configuration
- `stripe-setup.md` - Stripe payment setup
- `video-frame-extractor-README.md` - Video utility documentation

### Documentation Standards
When making changes:
1. **Always update CHANGELOG.md** with the date, feature name, and details
2. **Never create new .md files** for features or changes
3. **Include file paths** for all code changes
4. **Add status** (✅ completed, ⚠️ in progress, ❌ deprecated)
5. **Reference related work** using internal links within CHANGELOG.md

### Example Entry Format
```markdown
## YYYY-MM-DD

### 🎯 Feature Name

**说明**: Brief description

**修改文件**:
- `path/to/file.ts` - What changed
- `path/to/other.ts` - What changed

**状态**: ✅ 已完成
```

This ensures all project knowledge is centralized and easily searchable.