## 1. Implementation
- [ ] 1.1 明确需求与验收标准（补全 `proposal.md`，确定 change-id 与 capability）
- [ ] 1.2 写 delta specs：在 `specs/text-to-image/spec.md` 增加/修改 Requirements + Scenarios
- [ ] 1.3 数据层（如需要）：更新 `prisma/schema.prisma` 并生成迁移
- [ ] 1.4 API 层：新增/修改 `app/api/**/route.ts` 并做好鉴权与输入校验
- [ ] 1.5 前端：新增/修改页面与组件，接入 API
- [ ] 1.6 回归：按手工回归清单验证（登录/匿名、生成、保存、画廊、配额、管理端）
- [ ] 1.7 文档：更新 `README.md` / `env.example`（如新增 env 或行为变更）


