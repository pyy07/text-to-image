# 文章转漫画功能说明

## 功能概述

用户可以输入微信公众号文章链接，系统将自动提取文章内容并生成多分镜漫画图片。

## 技术实现

### 1. 数据库模型

新增 `ComicTask` 模型，用于存储漫画生成任务：

- `articleUrl`: 文章链接
- `articleTitle`: 文章标题
- `articleContent`: 抓取的原始文章内容
- `summary`: 文章摘要
- `storyboards`: 分镜脚本（JSON 格式）
- `status`: 任务状态（pending/fetching/summarizing/generating/completed/failed）
- `currentStep`: 当前步骤（0-4）
- `resultImages`: 生成的图片 URL（JSON 数组）

### 2. 核心服务

#### 文章抓取服务 (`lib/services/article-fetcher.ts`)

- 验证公众号文章链接
- 通过服务端代理抓取文章内容
- 使用 cheerio 解析 HTML 提取标题和正文
- 清理 HTML 标签和多余空白

#### 漫画生成服务 (`lib/services/comic-generation.ts`)

- 生成文章摘要
- 将摘要转换为 4-6 个分镜脚本
- 构建多分镜漫画的 prompt
- 调用 AI 生成单张多分镜漫画图片

### 3. API 接口

#### POST /api/comic

创建漫画生成任务

请求体：
```json
{
  "articleUrl": "https://mp.weixin.qq.com/s/...",
  "userId": "可选，用户ID"
}
```

响应：
```json
{
  "taskId": "任务ID",
  "status": "pending",
  "message": "任务已创建，正在处理中"
}
```

#### GET /api/comic/[id]

查询任务状态和结果

响应：
```json
{
  "id": "任务ID",
  "status": "completed",
  "currentStep": 4,
  "totalSteps": 4,
  "articleTitle": "文章标题",
  "summary": "文章摘要",
  "storyboards": [...],
  "resultImages": ["图片URL"],
  "createdAt": "创建时间",
  "updatedAt": "更新时间"
}
```

#### POST /api/fetch-article

抓取文章内容（内部使用）

### 4. 前端组件

#### ArticleToComicInput

文章链接输入组件，支持：
- URL 格式验证
- 提交按钮状态管理
- 加载状态显示

#### ComicProgressBar

进度条组件，显示：
- 当前步骤（0-4）
- 进度百分比
- 步骤标签（待处理/抓取文章/生成摘要/生成分镜/生成图片）
- 状态颜色（蓝色-进行中，绿色-完成，红色-失败）

#### ComicViewer

漫画查看器组件，显示：
- 文章标题
- 文章摘要
- 多分镜漫画图片
- 分镜说明
- 下载按钮

### 5. 页面路由

#### /comic

文章转漫画页面，功能：
- 输入文章链接
- 实时显示生成进度（每 2 秒轮询）
- 展示生成结果
- 支持重新生成

## 配置说明

### 文生漫功能开关与 Gemini 配置（推荐）

文生漫使用**独立配置**，与主站文生图/合成的 OpenAI 配置分离：

- **开关**：`COMIC_ENABLED=true` 时才会提供文生漫能力；关闭后首页不显示「文生漫」标签，`POST /api/comic` 返回 503。
- **Base URL**：`COMIC_GEMINI_BASE_URL`，指向 Gemini API（或兼容的代理），例如 Google 官方：`https://generativelanguage.googleapis.com/v1beta`。
- **API Key**：`COMIC_GEMINI_API_KEY`，文生漫专用，不与 `GOOGLE_AI_API_KEY` / `OPENAI_API_KEY` 混用。
- **模型**：`COMIC_GEMINI_MODEL`（可选），默认 `gemini-2.0-flash-exp`，可按需改为支持多图+文生图的模型。

实现方式：将公众号文章配图**下载为 base64**，与正文一起作为多模态输入调用 Gemini `generateContent`，生成一张九宫格漫画分镜总结图。

```env
# 文生漫：开关 + 独立 Gemini 配置
COMIC_ENABLED=true
COMIC_GEMINI_BASE_URL="https://generativelanguage.googleapis.com/v1beta"
COMIC_GEMINI_API_KEY="your-gemini-api-key"
COMIC_GEMINI_MODEL="gemini-2.0-flash-exp"
```

### UniAPI 配置（未配置 Gemini 时的回退）

若未设置 `COMIC_GEMINI_BASE_URL` 与 `COMIC_GEMINI_API_KEY`，且 `COMIC_ENABLED=true`，则使用现有 OpenAI 兼容接口（UniAPI / nano-banana-pro 等）：

```env
# AI Provider 配置
AI_PROVIDERS="openai"
AI_PROVIDER="openai"

# UniAPI 配置（通过 OpenAI 兼容接口）
OPENAI_API_KEY="your-uniapi-key"
OPENAI_BASE_URL="https://api.uniapi.ai/v1"
OPENAI_MODELS="nano-banana-pro"
OPENAI_MODEL="nano-banana-pro"
OPENAI_IMAGE_SIZE="1024x1024"
```

### 数据库迁移

运行以下命令应用数据库变更：

```bash
npx prisma generate
npx prisma db push
```

## 使用流程

1. 用户访问 `/comic` 页面
2. 输入微信公众号文章链接
3. 点击"生成漫画"按钮
4. 系统创建任务并开始处理：
   - 步骤 1：抓取文章内容
   - 步骤 2：生成文章摘要
   - 步骤 3：生成分镜脚本
   - 步骤 4：生成多分镜漫画图片
5. 前端每 2 秒轮询任务状态
6. 任务完成后展示结果
7. 用户可下载生成的漫画图片

## 技术特点

1. **异步任务处理**：使用数据库记录任务状态，支持长时间运行的生成任务
2. **实时进度反馈**：前端轮询显示当前处理步骤
3. **多分镜漫画**：生成单张包含多个分镜的漫画图片，而非多张独立图片
4. **错误处理**：完善的错误捕获和用户提示
5. **响应式设计**：适配不同屏幕尺寸

## 文件清单

### 新增文件

- `prisma/schema.prisma` - 添加 ComicTask 模型
- `lib/services/article-fetcher.ts` - 文章抓取服务
- `lib/services/comic-generation.ts` - 漫画生成服务
- `app/api/fetch-article/route.ts` - 文章抓取 API
- `app/api/comic/route.ts` - 漫画生成 API
- `app/api/comic/[id]/route.ts` - 任务查询 API
- `components/ArticleToComicInput.tsx` - 输入组件
- `components/ComicProgressBar.tsx` - 进度条组件
- `components/ComicViewer.tsx` - 查看器组件
- `app/comic/page.tsx` - 文章转漫画页面

### 修改文件

- `components/Navigation.tsx` - 添加导航链接
- `package.json` - 添加 cheerio 依赖

## 后续优化建议

1. **摘要生成优化**：集成 LLM API 生成更精准的文章摘要
2. **分镜脚本优化**：使用 AI 生成更有故事性的分镜脚本
3. **图片存储**：将生成的图片上传到 Vercel Blob 存储
4. **用户权限**：添加使用次数限制和权限验证
5. **历史记录**：在"我的素材"页面展示历史生成的漫画
6. **批量处理**：支持批量处理多篇文章
7. **自定义样式**：允许用户选择漫画风格（日漫、美漫等）
