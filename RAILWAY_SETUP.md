# 🚂 Railway 部署完整指南

## 📋 概述

Railway 是最简单的服务器部署方式，支持自动从 GitHub 部署。

## 🚀 快速开始（推荐方式）

### 方式 1: Railway 平台自动部署（最简单）⭐

这是最推荐的方式，Railway 会自动监听 GitHub 推送并部署。

#### 步骤 1: 创建 Railway 账号

1. 访问 https://railway.app
2. 点击 "Start a New Project"
3. 选择 "Login with GitHub"
4. 授权 Railway 访问你的 GitHub 账号

#### 步骤 2: 创建新项目

1. 在 Railway Dashboard 点击 "New Project"
2. 选择 "Deploy from GitHub repo"
3. 选择你的 `maimai-usa` 仓库
4. Railway 会自动检测并创建服务

#### 步骤 3: 配置服务

Railway 会自动检测到 Node.js 项目，但需要配置：

1. **点击服务名称**进入服务设置

2. **Settings → Source**
   - 确认 Repository 正确
   - 确认 Branch 是 `master` 或 `main`
   - Root Directory: `/`（留空，使用根目录）

3. **Settings → Build & Deploy**
   - **Build Command**: 留空（服务器不需要构建）
   - **Start Command**: `npm run server`
   - **Watch Paths**: 可以留空，或设置为 `server/**`

#### 步骤 4: 配置环境变量

在 **Variables** 标签页添加以下环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `NODE_ENV` | `production` | 生产环境 |
| `PORT` | `3001` | 服务器端口（Railway 会自动设置，但可以指定） |
| `DISCORD_CLIENT_ID` | 你的客户端 ID | 从 Discord Developer Portal 获取 |
| `DISCORD_CLIENT_SECRET` | 你的客户端密钥 | 从 Discord Developer Portal 获取 |
| `DISCORD_CALLBACK_URL` | `https://你的railway域名.up.railway.app/auth/discord/callback` | 部署后更新为实际域名 |
| `FRONTEND_URL` | `https://你的前端域名` | 你的 Cloudflare Pages 域名 |
| `SESSION_SECRET` | 生成的强密码 | 运行 `openssl rand -base64 32` 生成 |
| `VITE_API_BASE_URL` | `https://你的railway域名.up.railway.app/api` | 部署后更新 |

**生成 SESSION_SECRET：**
```bash
openssl rand -base64 32
```

#### 步骤 5: 获取域名

1. 在服务设置中，找到 **Settings → Networking**
2. Railway 会自动分配一个域名，格式：`你的服务名.up.railway.app`
3. 或者点击 "Generate Domain" 生成自定义域名

#### 步骤 6: 更新环境变量中的 URL

部署后，Railway 会分配域名，需要更新：

1. 复制 Railway 分配的域名（例如：`maimai-api.up.railway.app`）
2. 更新 `DISCORD_CALLBACK_URL`：
   ```
   https://maimai-api.up.railway.app/auth/discord/callback
   ```
3. 更新 `VITE_API_BASE_URL`（如果需要）：
   ```
   https://maimai-api.up.railway.app/api
   ```

#### 步骤 7: 更新 Discord 应用配置

1. 访问 [Discord Developer Portal](https://discord.com/developers/applications)
2. 选择你的应用
3. 进入 **OAuth2** → **General**
4. 在 **Redirects** 中添加：
   ```
   https://你的railway域名.up.railway.app/auth/discord/callback
   ```
5. 保存更改

#### 步骤 8: 更新前端配置

在项目根目录创建 `.env.production` 文件：

```bash
VITE_API_BASE_URL=https://你的railway域名.up.railway.app/api
```

然后重新构建并部署前端。

#### 步骤 9: 验证部署

1. **检查 Railway 部署日志**
   - 在 Railway Dashboard 查看服务
   - 点击 "Deployments" 查看部署历史
   - 点击最新的部署查看日志

2. **测试 API**
   ```bash
   curl https://你的railway域名.up.railway.app/api/forum
   ```

3. **测试 Discord 认证**
   - 访问前端网站
   - 尝试登录
   - 应该能正常重定向

### ✅ 完成！

现在每次你推送代码到 GitHub 的 `master` 或 `main` 分支时，Railway 会自动：
1. 检测到更改
2. 拉取最新代码
3. 安装依赖
4. 重启服务器

**无需任何手动操作！** 🎉

---

## 🔧 方式 2: 使用 GitHub Actions（可选）

如果你想要通过 GitHub Actions 控制部署，可以配置：

### 配置 GitHub Secrets

在 GitHub 仓库设置中添加：

- `RAILWAY_TOKEN` - Railway API Token
  - 获取方式：Railway Dashboard → Account → Tokens → New Token
  - 权限：选择 "Full Access" 或 "Deploy"
  
- `RAILWAY_PROJECT_ID` - Railway 项目 ID
  - 获取方式：Railway Dashboard → 项目设置 → 项目 ID

### 手动触发部署

1. 进入 GitHub Actions
2. 选择 "Deploy Server" 工作流
3. 点击 "Run workflow"
4. 选择 `railway` 作为部署目标

---

## 📊 Railway 配置参考

### 推荐配置

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run server",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 创建 railway.json（可选）

在项目根目录创建 `railway.json`：

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run server",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

## 🛠️ 故障排除

### 部署失败

1. **检查日志**
   - Railway Dashboard → 服务 → Deployments → 查看日志
   - 查找错误信息

2. **常见问题**
   - **端口错误**: Railway 会自动设置 `PORT` 环境变量，确保代码使用 `process.env.PORT`
   - **依赖安装失败**: 检查 `package.json` 是否正确
   - **启动命令错误**: 确认 `Start Command` 是 `npm run server`

### 服务器无法启动

1. **检查环境变量**
   - 确认所有必需的环境变量都已设置
   - 检查值是否正确（特别是 URL）

2. **检查日志**
   ```bash
   # 在 Railway Dashboard 查看实时日志
   ```

3. **测试本地运行**
   ```bash
   # 在本地测试
   npm run server
   ```

### Discord 认证失败

1. **检查回调 URL**
   - 确认 `DISCORD_CALLBACK_URL` 与 Discord 应用设置中的 URL 完全匹配
   - 确认使用 HTTPS（Railway 自动提供）

2. **检查环境变量**
   - 确认 `DISCORD_CLIENT_ID` 和 `DISCORD_CLIENT_SECRET` 正确
   - 确认 `FRONTEND_URL` 设置正确

### CORS 错误

1. **检查 FRONTEND_URL**
   - 确认 `FRONTEND_URL` 环境变量设置正确
   - 确认没有尾部斜杠
   - 确认使用 HTTPS

2. **检查服务器代码**
   - 确认 CORS 配置正确（`server/index.js`）

---

## 💰 Railway 定价

### 免费套餐

- $5 免费额度/月
- 足够运行一个小型 API 服务器
- 自动休眠（15 分钟无活动后）
- 唤醒时间约 30 秒

### 付费套餐

如果需要：
- 更快的响应时间（无休眠）
- 更多资源
- 自定义域名（免费套餐也支持）

---

## 🔄 更新部署

### 自动更新（推荐）

每次推送到 GitHub 主分支，Railway 会自动部署。

### 手动触发

1. Railway Dashboard → 服务
2. 点击 "Redeploy"
3. 选择要部署的提交

### 回滚

1. Railway Dashboard → 服务 → Deployments
2. 找到之前的成功部署
3. 点击 "Redeploy"

---

## 📚 相关文档

- [Railway 官方文档](https://docs.railway.app)
- `SERVER_DEPLOYMENT.md` - 通用服务器部署指南
- `DEPLOYMENT_PROD.md` - 生产环境配置
- `AUTO_DEPLOY_SETUP.md` - 自动部署设置

---

## ✅ 检查清单

部署前确认：

- [ ] Railway 账号已创建
- [ ] 项目已连接到 GitHub 仓库
- [ ] 服务配置正确（Start Command: `npm run server`）
- [ ] 所有环境变量已设置
- [ ] Discord 回调 URL 已更新
- [ ] 前端 `VITE_API_BASE_URL` 已更新
- [ ] 测试部署成功
- [ ] 测试 Discord 认证
- [ ] 测试 API 端点

---

## 🎉 完成！

配置完成后，你的部署流程将是：

1. 编写代码
2. 提交并推送到 GitHub
3. **Railway 自动检测并部署** ✨
4. 服务器自动更新
5. 完成！

享受自动化部署的便利！🚀

