# Change: 增加图片编辑（图生图/以图改图）与上传图片编辑能力

## Why
当前项目已支持“文生图 → 上传到 Blob → 落库为 Asset → 画廊展示”的闭环，但缺少**以图改图/上传图编辑**能力。增加该能力后，用户可以基于已有素材或上传图片进行修改（例如：替换风格、改背景、加文字、局部调整等），并同样保存为可复用素材。

## What Changes
- 新增：**图片编辑（图生图/以图改图）**
  - 基于已有素材（Asset）选择原图 + 输入编辑指令（prompt）生成新图
  - 上传图片作为输入图 + 输入编辑指令（prompt）生成新图
- 新增/调整：API
  - 新增/扩展图片生成 API 以支持传入“输入图”（推荐新增 `POST /api/edit` 或在 `POST /api/generate` 增加可选字段并保持向后兼容）
  - 新增上传入口（若采用“先上传后编辑”）：`POST /api/uploads/image`（将用户上传图片存入 Blob 并返回 URL）
- 新增/调整：数据层
  - `Asset` 记录编辑链路（例如：`sourceAssetId`/`inputImageUrl`/`operation` 等），便于追溯“由哪张图编辑而来”
- Provider 支持策略
  - 仅在支持图生图/编辑的 Provider/模型下启用该能力；不支持时返回可理解错误

## Impact
- Affected specs:
  - `specs/text-to-image/spec.md`（本次先以该 capability 作为占位；确认后可拆分/重命名）
- Affected code (expected):
  - `app/api/**/route.ts`（新增或修改接口）
  - `app/**/page.tsx`、`components/**`（新增或修改 UI）
  - `lib/ai/**` / `lib/auth.ts` / `lib/storage/**`（如涉及）
  - `prisma/schema.prisma`（如涉及数据结构）

## Open Questions
- 你希望首期接哪一家能力？
  - A) 继续用 ModelScope API-Inference（如 `Tongyi-MAI/Z-Image-*`）的“图生图/编辑”接口（若存在且稳定）
  - B) 走 OpenAI 官方/代理的 images edit / image-to-image 能力
- 编辑形态要做到哪一步？
  - A) 只做“整体以图改图”（输入图 + prompt）
  - B) 还要支持 mask（局部编辑）、强度/步数等参数
- 计费/配额：编辑是否与生成同样消耗一次 `usageCount`？（默认：是）

## Findings (ModelScope)
- `Tongyi-MAI/Z-Image-Turbo` 的 ModelScope metadata 显示 `SupportInference=txt2img`，仅支持文生图，不包含编辑能力；`Z-Image-Edit` 在其 README 中标注为 *To be released*（尚未发布）。参考：`https://modelscope.cn/models/Tongyi-MAI/Z-Image-Turbo`
- ModelScope 侧可用的“以图改图/图像编辑”路径：`Qwen/Qwen-Image-Edit-2509`（metadata：`SupportInference=img2img` / task：`image-to-image`）。
  - 其 API-Inference 调用示例使用 `POST /v1/images/generations` + 异步任务轮询，并在 body 中提供 `image_url: [ ... ]`（输入图列表）以完成编辑。
  - 参考文章（含参数表与示例代码）：`https://modelscope.csdn.net/691c36ee82fbe0098caca391.html`
- mask/局部编辑：在上述公开示例与参数表中**未发现** mask 参数；若需要 mask，可能需要 ModelScope 侧提供专用 inpainting 模型/参数（待进一步确认），否则需 fallback 到支持 mask 的 Provider（例如 OpenAI images edits）。


