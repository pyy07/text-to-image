# 文生图生成器（Text-to-Image）

一个基于 Next.js 的文生图平台，通过 **OpenAI 兼容接口**调用 modelscope 的 **`z-image`** 模型生成图片，并将生成结果以 **URL（对象存储/外链）** 的形式保存为素材。

## 功能特性

- 🖼️ 根据自然语言描述生成图片（文生图）
- 🤖 使用 OpenAI 兼容接口（支持自定义 `OPENAI_BASE_URL`），默认适配 modelscope
- 🔐 用户使用次数限制（默认 3 次）
- 🔑 微信登录支持
- 💾 素材自动保存和管理
- 📱 响应式设计

## 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **数据库**: PostgreSQL (Prisma ORM)
- **AI**: OpenAI 兼容 API（modelscope z-image）
- **认证**: NextAuth.js + 微信 OAuth
- **样式**: Tailwind CSS

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填写相关配置：

```bash
cp .env.example .env
```

需要配置的变量（详见 `.env.example`）：

**必填项：**
- `DATABASE_URL`: PostgreSQL 数据库连接字符串
- 至少一个 AI Provider 的 API Key：
  - `OPENAI_API_KEY`: OpenAI 兼容接口的 API Key（modelscope 或其他兼容服务）
- `NEXTAUTH_SECRET`: NextAuth 密钥
- `NEXTAUTH_URL`: 应用访问地址

**AI Provider 配置（可选）：**
- `AI_PROVIDER`: 默认使用的 Provider（`gemini` 或 `openai`）
- `OPENAI_MODEL`: 图片模型名称（默认：`z-image`）
- `OPENAI_BASE_URL`: OpenAI API 基础 URL（默认：`https://api.openai.com/v1`）
  - 可用于配置代理服务或兼容 API
  - 示例：`https://api.openai-proxy.com/v1`
- `OPENAI_IMAGE_SIZE`: 图片尺寸（默认：`1024x1024`）

**其他可选配置：**
- `WECHAT_APP_ID`: 微信开放平台 AppID
- `WECHAT_APP_SECRET`: 微信开放平台 AppSecret
- `ALLOW_ANONYMOUS`: 允许匿名访问（本地测试用）
- `HTTPS_PROXY` / `HTTP_PROXY`: 代理地址

详细配置说明和示例请参考 `.env.example` 文件中的注释。

### 3. 初始化数据库

```bash
npx prisma migrate dev
```

### 4. 运行开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 项目结构

```
.
├── app/                    # Next.js App Router 页面和 API 路由
│   ├── api/               # API 路由
│   │   ├── generate/      # 图片生成接口
│   │   ├── user/          # 用户信息接口
│   │   ├── assets/        # 素材管理接口
│   │   └── auth/          # 认证接口
│   └── page.tsx           # 首页
├── components/            # React 组件
├── lib/                   # 工具函数
│   ├── prisma.ts         # Prisma 客户端
│   ├── ai/               # AI Provider 抽象层
│   │   ├── types.ts      # Provider 类型定义
│   │   ├── factory.ts    # Provider 工厂函数
│   │   └── providers/    # 具体 Provider 实现
│   │       ├── gemini.ts # Gemini Provider
│   │       └── openai.ts # OpenAI Provider
│   └── auth.ts           # 认证相关函数
├── prisma/               # Prisma schema
└── public/               # 静态资源
```

## 部署

### Vercel 部署

1. 将代码推送到 GitHub
2. 在 Vercel 中导入项目
3. 配置环境变量
4. 部署完成

### 数据库设置

推荐使用 Vercel Postgres 或 Supabase：

1. 创建 PostgreSQL 数据库
2. 获取连接字符串
3. 在环境变量中配置 `DATABASE_URL`
4. 运行 `npx prisma migrate deploy` 部署数据库 schema

## AI Provider 配置

项目支持多个 AI 模型提供商，使用 Provider 模式实现。**重要：配置文件决定前端显示哪些选项，用户只能选择配置文件中允许的 Provider 和模型。**

### 配置方式

配置文件（环境变量）控制：
1. **启用哪些 Provider**：通过 `AI_PROVIDERS` 配置
2. **每个 Provider 允许使用哪些模型**：通过 `GEMINI_MODELS` 和 `OPENAI_MODELS` 配置
3. **前端显示**：前端通过 `/api/providers` 接口获取配置，只显示配置文件中允许的选项
4. **用户选择**：用户只能在前端选择配置文件中允许的 Provider 和模型

### 支持的 Provider

1. **Google Gemini** (`gemini`)
   - 需要配置 `GOOGLE_AI_API_KEY`
   - 需要配置 `GEMINI_MODELS`（允许使用的模型列表）
   - 可用模型：`gemini-2.0-flash-exp`、`gemini-1.5-pro`、`gemini-1.5-flash`、`gemini-pro`

2. **OpenAI** (`openai`)
   - 需要配置 `OPENAI_API_KEY`
   - 需要配置 `OPENAI_MODELS`（允许使用的模型列表）
   - 可用模型：`gpt-4o`、`gpt-4-turbo`、`gpt-4`、`gpt-3.5-turbo`

### 配置示例

#### 示例1：只启用 Gemini Provider

```env
# 启用 Gemini Provider
AI_PROVIDERS=gemini

# Gemini API Key
GOOGLE_AI_API_KEY=your-gemini-api-key

# Gemini 允许使用的模型（只允许这两个）
GEMINI_MODELS=gemini-2.0-flash-exp,gemini-1.5-pro
```

前端只会显示：
- Provider: Google Gemini
- 模型: gemini-2.0-flash-exp, gemini-1.5-pro

#### 示例2：启用多个 Provider，限制模型

```env
# 启用多个 Provider
AI_PROVIDERS=gemini,openai

# 默认 Provider
AI_PROVIDER=openai

# Gemini 配置
GOOGLE_AI_API_KEY=your-gemini-api-key
GEMINI_MODELS=gemini-2.0-flash-exp

# OpenAI 配置
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODELS=gpt-4o,gpt-4-turbo
# 使用代理（可选）
OPENAI_BASE_URL=https://api.openai-proxy.com/v1
```

前端会显示：
- Provider: Google Gemini, OpenAI（默认选中 OpenAI）
- Gemini 模型: gemini-2.0-flash-exp
- OpenAI 模型: gpt-4o, gpt-4-turbo

#### 示例3：只允许使用特定模型

```env
AI_PROVIDERS=openai
OPENAI_API_KEY=your-openai-api-key
# 只允许使用 gpt-4o
OPENAI_MODELS=gpt-4o
```

前端只会显示：
- Provider: OpenAI
- 模型: gpt-4o（用户无法选择其他模型）

### 配置说明

**必填项：**
- `AI_PROVIDERS`：启用哪些 Provider（格式：`gemini,openai`）
- 对应 Provider 的 API Key（`GOOGLE_AI_API_KEY` 或 `OPENAI_API_KEY`）
- 对应 Provider 的模型列表（`GEMINI_MODELS` 或 `OPENAI_MODELS`）

**可选项：**
- `AI_PROVIDER`：默认 Provider（如果不配置，使用 `AI_PROVIDERS` 中的第一个）
- `OPENAI_BASE_URL`：OpenAI API 基础 URL（用于代理或兼容 API）

**工作原理：**
1. 后端读取 `AI_PROVIDERS` 和模型列表配置
2. 前端调用 `/api/providers` 获取允许的 Provider 和模型
3. 前端只显示配置文件中允许的选项
4. 用户选择后，后端验证选择的 Provider 和模型是否在允许列表中
5. 如果不在允许列表中，返回错误

### OpenAI BASE_URL 配置说明

`OPENAI_BASE_URL` 允许你自定义 OpenAI API 的端点地址，常见用途：

1. **使用代理服务**：如果无法直接访问 OpenAI API，可以使用代理服务
   ```env
   OPENAI_BASE_URL=https://api.openai-proxy.com/v1
   ```

2. **使用兼容 API**：使用兼容 OpenAI API 格式的其他服务
   ```env
   OPENAI_BASE_URL=https://your-compatible-api.com/v1
   ```

3. **本地测试**：使用本地运行的兼容服务进行测试
   ```env
   OPENAI_BASE_URL=http://localhost:8080/v1
   ```

如果不配置 `OPENAI_BASE_URL`，将使用默认的 OpenAI 官方 API 地址。

## 本地测试模式

为了方便本地开发测试，可以启用匿名访问模式，无需登录即可生成图片：

在 `.env` 文件中添加：
```env
ALLOW_ANONYMOUS=true
```

启用后：
- ✅ 无需登录即可生成图片
- ✅ 不限制使用次数
- ✅ 生成的图片仍会保存为素材（保存 URL）
- ⚠️ 仅用于本地开发，生产环境请勿启用

## 开发

### 代码格式化

```bash
npm run format
```

### 数据库迁移

```bash
# 创建迁移
npx prisma migrate dev --name migration_name

# 应用迁移
npx prisma migrate deploy
```

### Prisma Studio

```bash
npx prisma studio
```

## 许可证

MIT

