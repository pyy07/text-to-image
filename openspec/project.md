# Project Context

## Purpose
本项目是一个 **文生图（Text-to-Image）生成与素材管理平台**，用户输入自然语言描述后，系统调用 **OpenAI 兼容接口**（可配置为 modelscope 等服务）生成图片，并将生成结果以 **URL（对象存储/外链）** 的形式保存为素材，支持画廊浏览与管理。

核心目标：
- 提供稳定、可配置的文生图能力（支持多 Provider/多模型白名单）
- 支持微信登录与使用次数/配额控制
- 将生成内容沉淀为可复用的素材（Asset）

## Tech Stack
- **框架**: Next.js 14（App Router）
- **语言**: TypeScript（`tsconfig.json` 开启 `strict`）
- **前端**: React 18
- **样式**: Tailwind CSS
- **后端**: Next.js Route Handlers（`app/api/**/route.ts`）
- **认证**: NextAuth.js（支持微信 OAuth；本地可启用匿名模式）
- **数据库/ORM**: PostgreSQL + Prisma
- **对象存储**: Vercel Blob（只保存 URL，不做双写）
- **AI**: OpenAI 兼容 API（支持自定义 `OPENAI_BASE_URL`；默认模型可为 `z-image` 等）

## Project Conventions

### Code Style
- **TypeScript 严格模式**：尽量避免 `any`，优先显式类型与运行时校验（尤其是 API 入参）。
- **模块组织**：
  - Next.js 页面与 API 路由放在 `app/`（API：`app/api/**/route.ts`）
  - 复用组件放在 `components/`
  - 业务/基础库放在 `lib/`（如 `lib/ai/**`, `lib/auth.ts`, `lib/prisma.ts`）
- **路径别名**：使用 `@/*` 指向仓库根（见 `tsconfig.json` 的 `paths`）。
- **格式化/Lint**：
  - 使用 `npm run format`（Prettier）格式化代码（当前仓库未提供 `.prettierrc`，默认配置为准）
  - 使用 `npm run lint`（Next ESLint）做静态检查

### Architecture Patterns
- **Provider/Factory 模式封装 AI 能力**：`lib/ai/factory.ts` 根据环境变量/配置选择 provider，并在后端做 provider/model 白名单校验。
- **配置驱动的前端选择项**：前端通过 `/api/providers` 获取允许的 Provider 与模型列表，只展示允许项；后端二次校验防止越权。
- **素材（Asset）作为一等实体**：生成结果（图片 URL、MIME、provider、model、描述等）落库到 `assets` 表以供画廊与详情页使用。
- **认证与权限**：
  - 生产：默认需要登录并受使用次数限制
  - 开发：可通过 `ALLOW_ANONYMOUS=true` 允许匿名生成并跳过次数限制（仅限本地/测试）

### Testing Strategy
当前仓库未包含单元测试/端到端测试文件（未发现 `*.test.*` / `*.spec.*`）。建议的最小测试策略：
- **关键 API 路由**：为 `/api/generate`、`/api/assets/*`、`/api/auth/*` 增加最小的集成测试（可后续引入 Playwright 或 Vitest）。
- **手工回归清单**：每次变更至少覆盖登录/匿名模式、生成、保存、画廊展示、配额限制与管理端操作。

### Git Workflow
建议约定（可按团队习惯调整）：
- **分支**：`main` 为稳定分支；每个需求/修复使用 `feature/<topic>` 或 `fix/<topic>` 分支。
- **提交信息**：建议使用 Conventional Commits（例如 `feat: ...`, `fix: ...`, `chore: ...`）。
- **OpenSpec**：新功能/破坏性变更先走 `openspec/changes/<change-id>/` 提案评审，通过后再实现代码。

## Domain Context
- **文生图**：用户输入 prompt（自然语言描述），后端调用 OpenAI 兼容接口生成图片。
- **Provider/Model**：
  - Provider 示例：`openai`、`gemini`
  - Model 由环境变量限制（如 `OPENAI_MODELS=z-image`），前后端均需遵守白名单
- **配额/次数**：用户表 `users` 记录 `usageCount`、`maxUsage`、`isPermanent` 等，用于限制生成次数（默认 3 次）。
- **素材管理**：`assets` 表是生成结果的持久化载体，核心字段包括 `description`、`type`、`imageUrl`、`mimeType`、`provider`、`model`、`createdAt` 等。

## Important Constraints
- **环境变量驱动**：Provider、模型白名单、Base URL、存储 Token 等均通过 env 配置；生产环境必须配置 `DATABASE_URL`、`NEXTAUTH_SECRET`、至少一个 Provider 的 API Key。
- **只存 URL**：生成图片落对象存储后，只在数据库保存 URL（避免大对象入库、避免双写）。
- **匿名模式仅用于本地**：`ALLOW_ANONYMOUS=true` 应视为开发/测试开关，生产环境应关闭。
- **部署区域**：`vercel.json` 指定 regions（例如 `hkg1`），需考虑外部 AI 服务可用性与网络访问。

## External Dependencies
- **OpenAI 兼容 API**：通过 `OPENAI_BASE_URL` + `OPENAI_API_KEY` 调用第三方（可为 modelscope 等兼容服务）。
- **Google Generative AI（可选）**：仓库依赖 `@google/generative-ai`，用于 Gemini Provider（由环境变量启用）。
- **PostgreSQL**：通过 `DATABASE_URL` 连接。
- **Vercel Blob**：通过 `BLOB_READ_WRITE_TOKEN` 上传并获取可访问 URL。
- **微信 OAuth（可选）**：需要 `WECHAT_APP_ID` / `WECHAT_APP_SECRET`（详见 `docs/WECHAT_SETUP.md`）。
