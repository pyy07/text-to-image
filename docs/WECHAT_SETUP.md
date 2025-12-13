# 微信登录配置指南

## 重要提示

微信登录支持两种方式：
1. **测试号/公众号**：使用网页授权，需要在微信客户端内打开
2. **网站应用**：使用扫码登录，可以在 PC 端扫码

**Scope 参数错误**通常是因为使用了错误的授权方式。测试号使用 `snsapi_userinfo`，网站应用使用 `snsapi_login`。

## 配置步骤

### 方式一：使用测试号（推荐用于开发测试）

1. 访问 [微信公众平台测试号](https://mp.weixin.qq.com/debug/cgi-bin/sandbox?t=jsapisandbox)
2. 使用微信扫码登录
3. 获取测试号的 AppID 和 AppSecret
4. **重要：配置网页授权域名**
   - 在测试号管理页面找到"网页授权获取用户基本信息"
   - 点击"修改"，填写授权域名（**只填域名，不填协议和路径**）
   - **本地开发**：填写 `localhost:3000` 或 `127.0.0.1:3000`
   - **生产环境**：填写你的域名，如 `your-domain.com`（不要加 `http://` 或 `https://`）
   - 保存配置
5. 在 `.env` 中配置：
   ```env
   WECHAT_APP_ID=测试号的AppID（通常以wx开头）
   WECHAT_APP_SECRET=测试号的AppSecret
   # 本地开发
   WECHAT_REDIRECT_URI=http://localhost:3000/api/auth/wechat
   # 或生产环境
   WECHAT_REDIRECT_URI=https://your-domain.com/api/auth/wechat
   ```
   **注意**：`WECHAT_REDIRECT_URI` 的域名部分必须与步骤4中配置的授权域名完全一致！
6. **注意**：测试号登录需要在微信客户端内打开链接

#### ⚠️ 常见错误：redirect_uri域名与后台配置不一致（错误码:10003）

**原因**：
- 测试号后台配置的授权域名与代码中使用的 `redirect_uri` 域名不一致
- 授权域名配置错误（包含了协议或路径）

**解决方法**：
1. 检查测试号后台"网页授权获取用户基本信息"中配置的域名
2. 确保 `.env` 中 `WECHAT_REDIRECT_URI` 的域名部分与后台配置完全一致
3. 授权域名只填域名，例如：
   - ✅ 正确：`localhost:3000` 或 `your-domain.com`
   - ❌ 错误：`http://localhost:3000` 或 `https://your-domain.com`
4. 修改配置后，可能需要等待几分钟生效

### 方式二：创建网站应用（用于生产环境）

1. 访问 [微信开放平台](https://open.weixin.qq.com/)
2. 注册并登录账号
3. 进入"网站应用" → "创建网站应用"
4. 填写应用信息：
   - 应用名称
   - 应用简介
   - 应用官网
   - **授权回调域名**：填写你的域名（如：`svg-generator.227studio.cn`）
5. 提交审核（通常需要 1-3 个工作日）

### 2. 获取 AppID 和 AppSecret

审核通过后，在网站应用详情页面可以获取：
- **AppID**（应用ID）
- **AppSecret**（应用密钥）

### 3. 配置环境变量

在 `.env` 文件中配置：

```env
# 微信开放平台网站应用的 AppID（不是公众号 AppID）
WECHAT_APP_ID=your_website_app_id

# 微信开放平台网站应用的 AppSecret
WECHAT_APP_SECRET=your_website_app_secret

# 授权回调地址（必须与开放平台配置的域名一致）
WECHAT_REDIRECT_URI=https://your-domain.com/api/auth/wechat

# 应用访问地址
NEXTAUTH_URL=https://your-domain.com
```

### 4. 常见错误

#### ❌ Scope 参数错误或没有 Scope 权限

**原因**：
- 使用了公众号的 AppID（mp.weixin.qq.com）
- 使用了移动应用的 AppID
- 网站应用未审核通过

**解决**：
- 确保使用网站应用的 AppID（open.weixin.qq.com）
- 等待网站应用审核通过
- 检查授权回调域名是否正确配置

#### ❌ 二维码不显示

**原因**：
- 微信二维码页面不支持 iframe 嵌入
- 需要跳转到微信官方页面

**解决**：
- 点击"微信扫码登录"按钮会跳转到微信官方二维码页面
- 这是正常行为，不是 bug

## 开发模式

如果未配置微信 AppID，系统会自动使用开发模式：
- 点击"开发模式登录"即可创建测试用户
- 无需微信授权，适合本地开发测试

## 测试

1. 配置完成后，重启开发服务器
2. 访问登录页面
3. 点击"微信扫码登录"
4. 使用微信扫码授权
5. 授权成功后自动返回并登录

## 参考文档

- [微信开放平台文档](https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login/Wechat_Login.html)
- [网站应用创建指南](https://open.weixin.qq.com/cgi-bin/frame?t=home/web_tmpl&lang=zh_CN)

