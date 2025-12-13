# Change: 新增功能（待定）

## Why
当前项目具备文生图生成、登录与素材管理的基础能力，但缺少一项你希望新增的业务功能（尚未明确）。本提案用于在实现前把需求与影响面写清楚，避免“边写边改”造成返工。

## What Changes
- 新增：**[TODO: 你要新增的功能一句话描述]**
- 新增/调整：对应的 API、页面/组件、数据库字段/表（如有）
- **BREAKING（如有）**：对外接口、数据库 schema、环境变量、鉴权规则的破坏性变更

## Impact
- Affected specs:
  - `specs/text-to-image/spec.md`（本次先以该 capability 作为占位；确认后可拆分/重命名）
- Affected code (expected):
  - `app/api/**/route.ts`（新增或修改接口）
  - `app/**/page.tsx`、`components/**`（新增或修改 UI）
  - `lib/ai/**` / `lib/auth.ts` / `lib/storage/**`（如涉及）
  - `prisma/schema.prisma`（如涉及数据结构）

## Open Questions
- 具体要加的功能是什么？一句话描述 + 2~3 条验收点即可。
- 是否需要登录才能使用？是否影响 `usageCount/maxUsage` 逻辑？
- 是否需要新增环境变量或第三方服务（例如新的存储/支付/通知）？


