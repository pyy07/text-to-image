# Design: 文生动画

## Context
- 项目已有文生图、图编辑、文生漫等能力，统一使用 Task 表记录异步任务、Asset 表保存产出物。
- 文生漫通过 UniAPI 的 Gemini 端点（`OPENAI_UNIAPI_BASE_URL` 推导 `.../gemini` + `OPENAI_UNIAPI_API_KEY`）调用 `@google/genai`，采用长文本结构化 prompt 驱动出图。
- 文生动画需产出可播放的动画（SVG 或 H5），而非静态图，且希望输出「更专业」——通过结构化提示词约束输出格式、动效与可访问性。

## Goals / Non-Goals
- **Goals**：提供文生动画 API/流程；支持 SVG、H5 两种格式；沿用 Task/Asset；模型可配置（默认 UniAPI gemini-3-flash-preview）；使用结构化提示词提升专业度。
- **Non-Goals**：不实现实时预览编辑器、不引入新数据库表、不替代现有文生图/文生漫流程。

## Decisions

### 1. 复用 Task 与 Asset 数据结构
- **决策**：不新增表。Task 增加一种 `type` 取值 `animation`；Asset 沿用现有字段表示动画结果。
- **理由**：与现有编辑/文生漫任务一致，前端可复用任务列表与轮询；Asset 已有 `type`（如 `svg`/`html`）、`imageUrl`、`svgCode`，可表达「动画文件 URL」或「内联 SVG/HTML 代码」。
- **实现要点**：创建动画任务时 `type='animation'`，`description` 存用户描述；完成后根据格式写 Asset：SVG 可上传到 Blob 存 `imageUrl` + `mimeType=image/svg+xml` 或存 `svgCode`；H5 可存 `svgCode`（历史字段曾用于 HTML）或上传 HTML 文件得 URL 存 `imageUrl`，`type` 设为 `html`。

### 2. 使用 UniAPI Gemini，模型可配置
- **决策**：文生动画调用 UniAPI 的 Gemini 端点（与文生漫相同推导：`OPENAI_UNIAPI_BASE_URL` → `.../gemini`），模型名通过环境变量配置，默认 `gemini-3-flash-preview`。
- **理由**：与现有文生漫、模型试用共用 UniAPI 配置，减少密钥与端点数量；gemini-3-flash-preview 适合代码/结构化输出，命名可配置便于后续切换模型。
- **实现要点**：新增 `lib/config/animation.ts`（或扩展现有 config），提供 `getAnimationGeminiConfig()`，读取 `ANIMATION_GEMINI_MODEL`（默认 `gemini-3-flash-preview`）、`OPENAI_UNIAPI_BASE_URL`、`OPENAI_UNIAPI_API_KEY`；开关如 `ANIMATION_ENABLED=true`。

### 3. 结构化提示词
- **决策**：采用分层结构化 prompt（角色 / 任务 / 输出格式 / 技术约束 / 用户描述），要求模型严格按指定格式（如 JSON 或明确标记的 code block）返回 SVG 或 H5 代码。
- **理由**：减少自由发挥、提高可解析性与一致性；便于约束动效规范（时长、循环、性能）、可访问性（ARIA、语义标签）和代码质量。
- **实现要点**：在 `lib/services/animation-generation.ts`（或等价）中维护 prompt 模板与格式说明；可根据「输出格式」参数（svg | h5）切换不同结构化说明；模型输出需解析并校验（提取 code block 或 JSON 中的 content），再写入 Asset。

### 4. 动画格式：SVG 与 H5
- **决策**：支持两种输出格式。SVG：单文件 SVG 内嵌 SMIL 或 CSS 动画；H5：单文件 HTML5（含 CSS/JS 动画，可内联或单文件）。
- **理由**：覆盖矢量动画与富交互/网页动画两类场景；与 Asset 现有 type（svg/html）一致。
- **实现要点**：请求参数包含 `format: 'svg' | 'h5'`；结构化 prompt 中明确该格式的语法与结构要求；存储时 Asset.type 与 mimeType/imageUrl/svgCode 按格式填写。

## Risks / Trade-offs
- **模型输出不稳定**：结构化输出可能偶发格式错误或夹杂说明文字 → 解析时做容错（正则/标记提取 code block），失败时重试或返回明确错误。
- **UniAPI 依赖**：与文生漫相同，依赖 UniAPI 可用性与配额 → 文档中说明环境变量与开关，与文生漫一致。
- **大 HTML/SVG 体积**：若存 `svgCode` 可能撑大数据库 → 优先上传到 Blob 存 URL，仅在小体积或需要内联展示时写 `svgCode`。

## Migration Plan
- 无数据库 schema 变更（仅 Task.type 注释与业务逻辑扩展）。
- 部署时增加环境变量（如 `ANIMATION_ENABLED`、`ANIMATION_GEMINI_MODEL`），未配置则功能不可用，不影响现有文生图/文生漫。

## Open Questions
- 前端入口：独立「文生动画」页 vs 在现有「模型试用」或任务中心中增加动画类型，可留给实现阶段与产品决定。
- 单次请求是否同时返回 SVG 与 H5：当前按「一次任务一种格式」设计，若需双格式可后续扩展为两次任务或模型一次返回两种（需在 prompt 与解析上约定）。
