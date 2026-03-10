## 1. 配置与开关
- [x] 1.1 新增 `lib/config/animation.ts`：`isAnimationEnabled()`、`getAnimationGeminiConfig()`，读取 `ANIMATION_ENABLED`、`ANIMATION_GEMINI_MODEL`（默认 `gemini-3-flash-preview`），复用 `OPENAI_UNIAPI_BASE_URL` / `OPENAI_UNIAPI_API_KEY`
- [x] 1.2 在 `env.example` 中增加文生动画相关环境变量说明（ANIMATION_ENABLED、ANIMATION_GEMINI_MODEL）

## 2. 结构化提示词与生成服务
- [x] 2.1 定义文生动画的结构化 prompt 模板（角色、任务、输出格式、技术约束、用户描述），支持 format=svg 与 format=h5 两种
- [x] 2.2 实现 `lib/services/animation-generation.ts`（或等价）：调用 UniAPI Gemini，传入结构化 prompt，解析模型返回的 SVG/H5 代码（code block 或约定格式）
- [x] 2.3 将解析后的内容上传至 Blob（或存内联）并创建 Asset（type=svg 或 html），返回可访问 URL 或 assetId

## 3. Task 与 API
- [x] 3.1 在创建 Task 时支持 type=`animation`，description 存用户描述，请求体可包含 format（svg|h5）、provider/model 可选
- [x] 3.2 在 `app/api/tasks/process/route.ts` 中识别 type=animation，调用动画生成服务，完成后更新 Task 的 resultImageUrl/resultAssetId
- [x] 3.3 确保任务列表与轮询接口返回的 task 中包含 type=animation 的完整字段（与现有 edit/comic 一致）
- [x] 3.4 （可选）在 Prisma schema 的 Task.type 注释中补充 `animation`

## 4. 前端与校验
- [x] 4.1 提供文生动画入口（独立页面或现有任务/试用页中增加「文生动画」选项），提交时传 type=animation、description、format
- [x] 4.2 后端校验：文生动画仅当 `ANIMATION_ENABLED` 为 true 且 UniAPI 配置存在时可创建；未配置时返回明确错误信息
- [x] 4.3 权限与配额：与现有任务一致，受登录/匿名与使用次数限制（若项目有）

## 5. 文档与验收
- [x] 5.1 在项目文档或 README 中说明文生动画的开关、环境变量与使用方式
- [ ] 5.2 验收：能创建 type=animation 任务、选择 SVG 或 H5、通过轮询或同步获得 resultAssetId/resultImageUrl，且 Asset 中 type 与内容格式正确；未配置时请求被拒绝并返回可读错误
