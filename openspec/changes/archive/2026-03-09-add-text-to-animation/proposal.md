# Change: 增加文生动画功能

## Why
用户需要从自然语言描述生成动画内容，用于营销、说明或展示场景。系统当前仅支持文生图与图编辑，缺少「文生动画」能力；通过复用现有 Task/Asset 流程并接入 UniAPI 的 Gemini 模型，可快速提供 SVG 与 H5 两种动画格式的生成，且使用结构化提示词提升输出专业度。

## What Changes
- 新增「文生动画」能力：用户输入文本描述，系统调用可配置的 UniAPI Gemini 模型（默认 `gemini-3-flash-preview`）生成动画。
- 动画输出格式支持 **SVG** 与 **H5**（HTML5 动画）两种；沿用现有 **Task** 与 **Asset** 数据结构（Task 新增 type=`animation`，Asset 使用现有 `type`/`imageUrl`/`svgCode` 等字段表示动画结果）。
- 模型与端点可配置：通过环境变量（如 `ANIMATION_GEMINI_MODEL`、复用 `OPENAI_UNIAPI_BASE_URL`/`OPENAI_UNIAPI_API_KEY`）选择 UniAPI 的 Gemini 端点与模型。
- 使用**结构化提示词**（角色、任务、输出格式、约束等）驱动模型生成，使动画在结构、可访问性与动效规范上更专业。

## Impact
- Affected specs: `text-to-image`
- Affected code: 新增 `lib/config/animation.ts`、`lib/services/animation-generation.ts`（或等价）、动画用结构化 prompt 常量/构建逻辑；`app/api/tasks/route.ts`、`app/api/tasks/process/route.ts` 支持 type=animation；可选 `app/api/animation/*` 或复用 tasks 创建与轮询；Prisma 仅需在 Task.type 注释中增加 `animation`（无需新表）；`env.example` 增加文生动画相关环境变量说明。
