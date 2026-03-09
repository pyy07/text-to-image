## 1. Implementation
- [ ] 1.1 明确需求与验收标准（补全 `proposal.md`，确定首期支持的 Provider 与编辑形态）
- [ ] 1.2 写 delta specs：在 `specs/text-to-image/spec.md` 增加“图片编辑（图生图/以图改图）” Requirements + Scenarios
- [ ] 1.3 数据层：扩展 `Asset` 以记录编辑来源（例如 `sourceAssetId`/`inputImageUrl`/`operation`），生成 Prisma 迁移
- [ ] 1.4 上传 API：实现 `POST /api/uploads/image`（multipart/form-data → Blob URL），并做类型/大小校验
- [ ] 1.5 编辑 API：实现 `POST /api/edit`（支持 `sourceAssetId` 或 `inputImageUrl` 两种输入图来源），并与配额/匿名逻辑对齐
- [ ] 1.6 Provider 适配：在 `lib/ai/providers/openai.ts` 增加图片编辑/图生图调用（按选定 Provider 的真实协议实现）
- [ ] 1.7 前端：`components/ImageGenerator.tsx` 增加模式切换（文生图/以图改图/上传图编辑）、上传控件、选择素材输入图
- [ ] 1.8 回归：按手工回归清单验证（登录/匿名、编辑生成、保存、画廊、配额、管理端）
- [ ] 1.9 文档：更新 `README.md` / `env.example`（新增接口说明/示例配置/注意事项）


