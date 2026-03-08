# 后台管理模块

管理员登录后台后可进行：**用户管理**、**操作管理**、**网站设置**。

## 入口与登录

- 后台入口：`/admin`（未登录会跳转到 `/admin/login`）
- 登录页：`/admin/login`，使用**管理员账户**的用户名与密码登录
- 使用 `.env` 中配置的 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 登录；若未配置则无法登录后台

## 管理员登录配置

在 `.env` 中配置账号和密码即可：

```env
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="你的密码"
```

配置后重启应用，打开 `/admin/login`，用上述账号密码登录即可进入后台。无需数据库中的用户或额外引导步骤。

## 功能说明

### 用户管理（/admin/users）

- 查看用户列表：昵称、使用次数、最大次数、是否永久用户
- 操作：设为/取消永久用户、重置使用次数、增加最大次数（+3 次）
- 所有操作会写入操作日志

### 操作管理（/admin/operations）

- 查看操作/审计日志列表
- 支持按 `action` 筛选（如 `user.update`、`settings.update`）
- 支持分页加载更多
- 显示时间、操作类型、目标、操作人、详情

### 网站设置（/admin/settings）

- 键值对形式的网站配置
- 预设常用键：`site_name`、`default_max_usage`、`maintenance_message`
- 可新增、修改、删除任意键值；修改后即时保存

## 技术说明

- 后台使用独立 token：登录成功后写入 `localStorage.admin_token`，请求时通过 `Authorization: Bearer <token>` 传给 `/api/admin/*`
- 所有 `/api/admin/*` 接口均校验管理员身份（解码 token 并检查 `users.isAdmin`）
- 操作日志表：`audit_logs`；网站设置表：`site_settings`
