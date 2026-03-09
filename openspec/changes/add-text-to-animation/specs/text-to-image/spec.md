## ADDED Requirements

### Requirement: 文生动画（文本描述生成动画）
系统 SHALL 支持用户通过自然语言描述生成动画，输出格式为 **SVG** 或 **H5**（HTML5）两种；任务与结果沿用现有 **Task** 与 **Asset** 数据结构；模型使用可配置的 UniAPI Gemini（默认 `gemini-3-flash-preview`）；生成过程 SHALL 使用结构化提示词，以提升动画在结构、动效与可访问性上的专业度。

#### Scenario: 用户提交文生动画任务并选择 SVG 格式成功
- **GIVEN** 文生动画功能已开启（如 `ANIMATION_ENABLED=true`）且 UniAPI Gemini 已配置
- **AND** 用户已满足使用条件（已登录或允许匿名）
- **WHEN** 用户提交一段文本描述并选择输出格式为 SVG
- **THEN** 系统创建一条 type=`animation` 的 Task，status 为 pending
- **AND** 系统异步或同步调用 UniAPI Gemini（使用结构化提示词）生成 SVG 动画代码
- **AND** 系统将生成的 SVG 保存为 Asset（type=svg），并通过 URL 或内联代码字段关联到 Task 的 resultAssetId
- **AND** Task 状态更新为 completed，用户可获取 resultImageUrl 或 resultAssetId

#### Scenario: 用户提交文生动画任务并选择 H5 格式成功
- **GIVEN** 文生动画功能已开启且 UniAPI Gemini 已配置
- **AND** 用户已满足使用条件
- **WHEN** 用户提交文本描述并选择输出格式为 H5
- **THEN** 系统创建 type=`animation` 的 Task
- **AND** 系统使用结构化提示词调用 Gemini 生成 HTML5 动画代码
- **AND** 系统将结果保存为 Asset（type=html），并关联到 Task
- **AND** Task 状态更新为 completed

#### Scenario: 文生动画未开启或未配置
- **GIVEN** `ANIMATION_ENABLED` 未设为 true，或 `OPENAI_UNIAPI_BASE_URL`/`OPENAI_UNIAPI_API_KEY` 未配置
- **WHEN** 用户请求创建文生动画任务
- **THEN** 系统拒绝并返回可理解的错误信息（例如：文生动画功能未开启或未配置 UniAPI）

#### Scenario: 使用可配置的动画模型
- **GIVEN** 环境变量 `ANIMATION_GEMINI_MODEL` 已设置为某模型名（如 `gemini-3-flash-preview`）
- **WHEN** 系统执行文生动画任务
- **THEN** 系统 SHALL 使用该模型调用 UniAPI Gemini 端点；若未配置则使用默认模型 `gemini-3-flash-preview`

#### Scenario: 结构化提示词驱动专业动画输出
- **GIVEN** 系统已实现文生动画的 prompt 构建逻辑
- **WHEN** 系统调用模型生成动画
- **THEN** 请求中 SHALL 包含结构化提示词（如角色、任务说明、输出格式约束、技术规范与用户描述）
- **AND** 输出格式约束 SHALL 明确要求模型按指定格式（如 code block 或 JSON）返回 SVG 或 H5 代码，以便解析与存储
