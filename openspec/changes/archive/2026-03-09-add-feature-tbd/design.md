## Context
当前系统仅支持“文生图”链路：`POST /api/generate` → Provider 生成图片 URL → 上传到 Vercel Blob → 落库 `Asset`。
新增“图片编辑/图生图”后，链路将变为：输入图（来自已有 Asset 或用户上传）+ prompt → Provider 编辑/生成 → Blob → Asset。

## Goals / Non-Goals
- Goals:
  - 支持两种输入图来源：**已有素材**与**用户上传**
  - 生成结果仍只保存 Blob URL（避免大对象入库）
  - 与现有鉴权/匿名/配额逻辑一致
  - 对不支持编辑的 Provider 给出可理解错误
- Non-Goals:
  - 首期不做复杂工作流（多图、多轮编辑历史 UI、版本树可视化）
  - mask/局部编辑、强度/步数等高级参数是否支持取决于首期选定 Provider

## Decisions
### Decision: API 拆分为 upload + edit
- 上传：`POST /api/uploads/image`，接收用户上传，返回 `inputImageUrl`（Blob URL）
- 编辑：`POST /api/edit`，接收 `sourceAssetId` 或 `inputImageUrl` 以及 `description`（prompt）
- 原有 `POST /api/generate` 保持文生图语义，避免混杂导致前端/错误处理复杂

### Decision: Asset 记录编辑来源
在 `Asset` 增加最小字段用于追溯：
- `operation`: `generate` | `edit`
- `sourceAssetId?`: 关联到原始 Asset（从素材库编辑）
- `inputImageUrl?`: 输入图 URL（从上传编辑）

## Risks / Trade-offs
- Provider 兼容性：不同服务的“图生图/编辑”协议差异大（同步 vs 异步、返回字段、是否支持 url/base64）
  - Mitigation：按 Provider 做适配层，首期只支持一条稳定路径；其余返回明确错误
- mask/局部编辑能力不确定：ModelScope 的公开 API 示例（Qwen-Image-Edit-2509）未展示 mask 参数；若必须支持 mask，可能需要额外模型（inpainting）或引入 fallback Provider
  - Mitigation：首期先交付“整体改图（img2img）”，mask 作为可选增强；若 Provider 不支持则返回明确错误，并在设计上保留 mask 字段与 UI 入口
- 安全：上传接口需要做文件类型/大小校验，避免滥用与成本风险
  - Mitigation：限制 MIME、大小、频率（可后续加速率限制）

## Migration Plan
1. 先扩展 schema 并迁移
2. 增加上传 API（返回 Blob URL）
3. 增加编辑 API（与配额/匿名一致）
4. 前端增加编辑模式与上传/选图入口

## Open Questions
- 首期 Provider 选择（ModelScope API-Inference / OpenAI 官方或代理 / 其他兼容服务）
- 是否需要 mask/局部编辑，以及对应的 UI/参数暴露范围


