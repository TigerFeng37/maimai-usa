# 🖥️ 服务器部署指南

## ⚠️ 重要说明

**当前 GitHub Actions 工作流只自动部署前端到 Cloudflare Pages，不会自动部署后端服务器。**

你需要单独部署后端服务器（Express API）到支持 Node.js 的平台。

---

## 📊 部署架构

```
┌─────────────────────────────────────┐
│   GitHub Actions (自动)              │
│   ↓                                  │
│   Cloudflare Pages                   │
│   (前端静态文件)                      │
└─────────────────────────────────────┘
              ↓ HTTP 请求
┌─────────────────────────────────────┐
│   后端服务器 (需要手动部署)          │
│   Express API (Node.js)              │
│   - 认证 (Discord OAuth)             │
│   - 论坛 API                         │
│   - 收藏 API                         │
│   - 人数统计 API                     │
└─────────────────────────────────────┘
```

---

## 🚀 服务器部署选项

### 选项 1: Railway（推荐 - 最简单）⭐

**优点：**
- 免费套餐可用
- 自动从 GitHub 部署
- 自动 HTTPS
- 环境变量管理简单

**部署步骤：**

1. **注册 Railway 账号**
   - 访问 https://railway.app
   - 使用 GitHub 账号登录

2. **创建新项目**
   - 点击 "New Project"
   - 选择 "Deploy from GitHub repo"
   - 选择你的仓库

3. **配置项目**
   - Railway 会自动检测 Node.js 项目
   - 设置启动命令：`npm run server`
   - 设置根目录：`/`（项目根目录）

4. **配置环境变量**
   在 Railway 项目设置中添加：
   ```
   NODE_ENV=production
   PORT=3001
   DISCORD_CLIENT_ID=你的客户端ID
   DISCORD_CLIENT_SECRET=你的客户端密钥
   DISCORD_CALLBACK_URL=https://你的服务器域名/auth/discord/callback
   FRONTEND_URL=https://你的前端域名
   SESSION_SECRET=生成的强密码（openssl rand -base64 32）
   ```

5. **获取域名**
   - Railway 会自动分配一个域名
   - 或使用自定义域名

6. **更新前端配置**
   - 在 `.env.production` 中设置：
   ```
   VITE_API_BASE_URL=https://你的railway域名/api
   ```

---

### 选项 2: Render

**优点：**
- 免费套餐可用
- 自动从 GitHub 部署
- 自动 HTTPS

**部署步骤：**

1. **注册 Render 账号**
   - 访问 https://render.com
   - 使用 GitHub 账号登录

2. **创建 Web Service**
   - 点击 "New" → "Web Service"
   - 连接你的 GitHub 仓库

3. **配置服务**
   - **Name**: `maimai-api`（或你喜欢的名字）
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run server`
   - **Root Directory**: `/`（留空）

4. **配置环境变量**
   在 Environment 标签页添加所有必需的环境变量

5. **部署**
   - Render 会自动部署
   - 获取分配的域名

---

### 选项 3: VPS（传统服务器）

**适合：** 已有 VPS 或需要完全控制

**部署步骤：**

1. **SSH 连接到服务器**
   ```bash
   ssh user@your-server.com
   ```

2. **安装 Node.js**
   ```bash
   # Ubuntu/Debian
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **克隆仓库**
   ```bash
   cd /var/www
   git clone https://github.com/your-username/maimai-usa.git
   cd maimai-usa
   ```

4. **安装依赖**
   ```bash
   npm install --production
   ```

5. **创建 .env 文件**
   ```bash
   nano .env
   ```
   添加所有必需的环境变量

6. **使用 PM2 运行（推荐）**
   ```bash
   # 安装 PM2
   npm install -g pm2
   
   # 启动服务器
   pm2 start server/index.js --name maimai-api
   
   # 设置开机自启
   pm2 startup
   pm2 save
   ```

7. **配置 Nginx 反向代理（可选）**
   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

### 选项 4: Heroku

**优点：**
- 简单易用
- 自动部署

**部署步骤：**

1. **安装 Heroku CLI**
   ```bash
   # macOS
   brew tap heroku/brew && brew install heroku
   ```

2. **登录 Heroku**
   ```bash
   heroku login
   ```

3. **创建应用**
   ```bash
   heroku create maimai-api
   ```

4. **设置环境变量**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set DISCORD_CLIENT_ID=你的ID
   # ... 设置其他变量
   ```

5. **部署**
   ```bash
   git push heroku master
   ```

---

### 选项 5: Fly.io

**优点：**
- 全球边缘部署
- 免费套餐

**部署步骤：**

1. **安装 Fly CLI**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **登录**
   ```bash
   fly auth login
   ```

3. **初始化**
   ```bash
   fly launch
   ```

4. **配置环境变量**
   ```bash
   fly secrets set DISCORD_CLIENT_ID=你的ID
   # ... 设置其他变量
   ```

---

## 🔄 自动部署服务器（已配置！）✅

**好消息！** 项目已经包含了 GitHub Actions 自动部署工作流。

### 📋 工作流说明

工作流文件：`.github/workflows/deploy-server.yml`

**自动触发条件：**
- 当 `server/` 目录有更改时
- 当 `package.json` 更改时
- 推送到 `master` 或 `main` 分支时

**支持的部署方式：**

#### 1. 部署到 VPS（通过 SSH）⭐

**配置 GitHub Secrets：**

在 GitHub 仓库设置中添加以下 secrets（Settings → Secrets and variables → Actions）：

- `SERVER_HOST` - 服务器 IP 或域名（例如：`123.45.67.89` 或 `api.yourdomain.com`）
- `SERVER_USER` - SSH 用户名（例如：`root` 或 `ubuntu`）
- `SERVER_SSH_KEY` - SSH 私钥（完整内容，包括 `-----BEGIN OPENSSH PRIVATE KEY-----`）
- `SERVER_PATH` - 服务器上的项目路径（可选，默认：`/var/www/maimai-usa`）
- `SERVER_PORT` - SSH 端口（可选，默认：`22`）
- `SERVER_HEALTH_CHECK_URL` - 健康检查 URL（可选，例如：`https://api.yourdomain.com/api/health`）

**生成 SSH 密钥对：**

```bash
# 在本地生成密钥对
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions_deploy

# 将公钥添加到服务器
ssh-copy-id -i ~/.ssh/github_actions_deploy.pub user@your-server.com

# 或者手动添加
cat ~/.ssh/github_actions_deploy.pub | ssh user@your-server.com "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"

# 将私钥内容复制到 GitHub Secrets
cat ~/.ssh/github_actions_deploy
# 复制整个输出（包括 -----BEGIN 和 -----END 行）到 SERVER_SSH_KEY secret
```

**服务器准备：**

确保服务器上已安装：
- Node.js 20+
- PM2（`npm install -g pm2`）
- Git

**首次部署：**

```bash
# SSH 到服务器
ssh user@your-server.com

# 克隆仓库
cd /var/www
git clone https://github.com/your-username/maimai-usa.git
cd maimai-usa

# 安装依赖
npm install --production

# 创建 .env 文件
nano .env
# 添加所有必需的环境变量

# 使用 PM2 启动（首次）
pm2 start server/index.js --name maimai-api
pm2 startup
pm2 save
```

之后，每次推送代码到 GitHub 时，工作流会自动：
1. 拉取最新代码
2. 安装依赖
3. 重启 PM2 服务

#### 2. Railway 自动部署

Railway 已经支持从 GitHub 自动部署，只需：
1. 在 Railway 中连接 GitHub 仓库
2. 每次推送到主分支会自动部署

**或者使用 GitHub Actions：**

配置 GitHub Secrets：
- `RAILWAY_TOKEN` - Railway API Token（在 Railway Dashboard → Account → Tokens 获取）
- `RAILWAY_PROJECT_ID` - Railway 项目 ID（在项目设置中查看）

#### 3. Render 自动部署

Render 也支持从 GitHub 自动部署，只需：
1. 在 Render 中连接 GitHub 仓库
2. 每次推送到主分支会自动部署

**或者使用 GitHub Actions：**

配置 GitHub Secrets：
- `RENDER_SERVICE_ID` - Render 服务 ID（在服务设置中查看）
- `RENDER_API_KEY` - Render API Key（在 Account → API Keys 获取）

### 🎯 手动触发部署

你也可以手动触发部署：

1. 进入 GitHub Actions 页面
2. 选择 "Deploy Server" 工作流
3. 点击 "Run workflow"
4. 选择部署目标（vps, railway, render）
5. 点击 "Run workflow"

### 📊 部署状态

部署后，你可以在 GitHub Actions 页面查看：
- 部署日志
- 部署状态（成功/失败）
- 部署摘要

---

## ✅ 部署后检查清单

部署服务器后，请验证：

- [ ] 服务器可以访问：`curl https://你的API域名/api/health`（如果有健康检查端点）
- [ ] Discord 认证工作正常
- [ ] 前端可以连接到 API（检查浏览器控制台）
- [ ] CORS 配置正确（前端域名在允许列表中）
- [ ] 环境变量都已正确设置
- [ ] HTTPS 已启用（生产环境必需）

---

## 🔧 故障排除

### 服务器无法启动

1. **检查日志**
   ```bash
   # PM2
   pm2 logs maimai-api
   
   # Railway/Render
   查看平台提供的日志
   ```

2. **检查端口**
   - 确保端口没有被占用
   - 检查防火墙设置

3. **检查环境变量**
   - 确认所有必需的环境变量都已设置
   - 检查值是否正确

### CORS 错误

- 确认 `FRONTEND_URL` 环境变量设置正确
- 确认前端域名与后端配置匹配
- 检查是否有尾部斜杠问题

### Discord 认证失败

- 确认 `DISCORD_CALLBACK_URL` 与 Discord 应用设置中的回调 URL 完全匹配
- 确认 `DISCORD_CLIENT_ID` 和 `DISCORD_CLIENT_SECRET` 正确
- 检查服务器是否使用 HTTPS（生产环境必需）

---

## 📚 相关文档

- `DEPLOYMENT_PROD.md` - 生产环境配置详细指南
- `PROD_ENV_QUICKREF.md` - 环境变量快速参考
- `README_API.md` - API 文档

---

## 💡 推荐配置

**对于大多数用户，推荐使用 Railway：**
- ✅ 最简单
- ✅ 免费套餐足够
- ✅ 自动部署
- ✅ 自动 HTTPS
- ✅ 环境变量管理简单

**如果你需要更多控制，使用 VPS + PM2：**
- ✅ 完全控制
- ✅ 可以自定义配置
- ✅ 成本可能更低（长期）

