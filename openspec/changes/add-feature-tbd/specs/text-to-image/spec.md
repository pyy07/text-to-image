## ADDED Requirements

### Requirement: 图片编辑（图生图/以图改图）
系统 MUST 支持用户提供“输入图 + 编辑指令（prompt）”生成新图片，并将结果保存为新的素材（Asset），同时保留与输入图的关联信息（用于追溯来源）。

#### Scenario: 基于已有素材编辑成功
- **GIVEN** 用户已满足使用条件（例如：已登录或允许匿名）
- **AND** 用户选择一条已有素材（Asset）作为输入图
- **WHEN** 用户提交编辑指令（prompt）并发起“以图改图”
- **THEN** 系统调用支持图编辑/图生图的 Provider/模型生成新图
- **AND** 系统将结果上传到对象存储并仅保存最终 URL
- **AND** 系统创建一条新的 Asset，记录 `sourceAssetId`（或等价字段）指向输入图

#### Scenario: 上传图片编辑成功
- **GIVEN** 用户已满足使用条件（例如：已登录或允许匿名）
- **AND** 用户上传一张图片作为输入图（系统获得可访问的输入图 URL）
- **WHEN** 用户提交编辑指令（prompt）并发起“上传图编辑”
- **THEN** 系统调用支持图编辑/图生图的 Provider/模型生成新图
- **AND** 系统将结果上传到对象存储并仅保存最终 URL
- **AND** 系统创建一条新的 Asset，记录 `inputImageUrl`（或等价字段）用于追溯来源

#### Scenario: Provider 或模型不支持图片编辑
- **GIVEN** 用户选择了不支持图片编辑的 Provider/模型
- **WHEN** 用户发起“以图改图/上传图编辑”
- **THEN** 系统拒绝并返回可理解的错误信息（例如：该 Provider 不支持图片编辑）

#### Scenario: Provider 不支持 mask 局部编辑
- **GIVEN** 用户提供了 mask（局部编辑）
- **AND** 当前 Provider/模型不支持 mask/inpainting
- **WHEN** 用户发起“局部编辑”
- **THEN** 系统拒绝并返回可理解的错误信息（例如：当前模型不支持 mask 局部编辑）

#### Scenario: 权限或配额不足
- **GIVEN** 用户不满足使用条件（例如：未登录且未开启匿名，或已超出 `maxUsage`）
- **WHEN** 用户发起“以图改图/上传图编辑”
- **THEN** 系统拒绝并返回可理解的错误信息


