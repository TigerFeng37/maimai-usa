# 🚀 自动部署快速设置指南

## 📋 概述

项目现在支持**自动部署**！当你推送代码到 GitHub 时：

- ✅ **前端**：自动部署到 Cloudflare Pages
- ✅ **后端服务器**：可以配置自动部署到 VPS、Railway 或 Render

## ⚡ 快速开始

### 方式 1: VPS 自动部署（推荐）

**适合：** 已有 VPS 服务器，想要完全控制

#### 步骤 1: 准备服务器

```bash
# SSH 到服务器
ssh user@your-server.com

# 安装 Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PM2
sudo npm install -g pm2

# 克隆仓库
cd /var/www
git clone https://github.com/your-username/maimai-usa.git
cd maimai-usa

# 安装依赖
npm install --production

# 创建 .env 文件
nano .env
# 添加所有必需的环境变量（参考 DEPLOYMENT_PROD.md）

# 首次启动
pm2 start server/index.js --name maimai-api
pm2 startup
pm2 save
```

#### 步骤 2: 生成 SSH 密钥

```bash
# 在本地生成密钥对
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions_deploy

# 将公钥添加到服务器
ssh-copy-id -i ~/.ssh/github_actions_deploy.pub user@your-server.com

# 或者手动添加
cat ~/.ssh/github_actions_deploy.pub | ssh user@your-server.com "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

#### 步骤 3: 配置 GitHub Secrets

1. 进入 GitHub 仓库
2. Settings → Secrets and variables → Actions
3. 添加以下 secrets：

| Secret 名称 | 值 | 说明 |
|------------|-----|------|
| `SERVER_HOST` | `123.45.67.89` 或 `api.yourdomain.com` | 服务器地址 |
| `SERVER_USER` | `root` 或 `ubuntu` | SSH 用户名 |
| `SERVER_SSH_KEY` | 私钥完整内容 | 运行 `cat ~/.ssh/github_actions_deploy` 获取 |
| `SERVER_PATH` | `/var/www/maimai-usa` | 项目路径（可选） |
| `SERVER_PORT` | `22` | SSH 端口（可选） |

**获取私钥：**
```bash
cat ~/.ssh/github_actions_deploy
# 复制整个输出（包括 -----BEGIN 和 -----END 行）
```

#### 步骤 4: 测试自动部署

```bash
# 推送一个小的更改
echo "# test" >> server/README.md
git add server/README.md
git commit -m "测试自动部署"
git push origin master
```

然后：
1. 进入 GitHub Actions 页面
2. 查看 "Deploy Server" 工作流
3. 确认部署成功

---

### 方式 2: Railway 自动部署（最简单）

**适合：** 想要最简单的部署体验

#### 步骤 1: 创建 Railway 项目

1. 访问 https://railway.app
2. 使用 GitHub 登录
3. 点击 "New Project"
4. 选择 "Deploy from GitHub repo"
5. 选择你的仓库

#### 步骤 2: 配置项目

- **Root Directory**: `/`（留空）
- **Build Command**: 留空（不需要构建）
- **Start Command**: `npm run server`

#### 步骤 3: 配置环境变量

在 Railway 项目设置中添加所有必需的环境变量（参考 `DEPLOYMENT_PROD.md`）

#### 步骤 4: 完成

Railway 会自动：
- 从 GitHub 拉取代码
- 安装依赖
- 启动服务器
- 分配域名

**之后每次推送代码都会自动部署！**

---

### 方式 3: Render 自动部署

**适合：** 想要免费且简单的部署

#### 步骤 1: 创建 Render 服务

1. 访问 https://render.com
2. 使用 GitHub 登录
3. 点击 "New" → "Web Service"
4. 连接你的 GitHub 仓库

#### 步骤 2: 配置服务

- **Name**: `maimai-api`
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm run server`
- **Root Directory**: `/`（留空）

#### 步骤 3: 配置环境变量

在 Environment 标签页添加所有必需的环境变量

#### 步骤 4: 完成

Render 会自动部署，之后每次推送代码都会自动更新！

---

## 🔍 验证部署

### 检查前端部署

1. 访问 Cloudflare Pages 项目
2. 查看部署历史
3. 访问生产 URL

### 检查服务器部署

**VPS:**
```bash
ssh user@your-server.com
pm2 status
pm2 logs maimai-api
```

**Railway/Render:**
- 查看平台提供的日志
- 检查服务状态

### 测试 API

```bash
# 测试服务器是否运行
curl https://api.yourdomain.com/api/health

# 或测试任意端点
curl https://api.yourdomain.com/api/forum
```

---

## 🛠️ 故障排除

### GitHub Actions 部署失败

1. **检查 Secrets 配置**
   - 确认所有必需的 secrets 都已设置
   - 检查值是否正确（特别是 SSH 密钥）

2. **检查服务器连接**
   ```bash
   # 测试 SSH 连接
   ssh -i ~/.ssh/github_actions_deploy user@your-server.com
   ```

3. **查看工作流日志**
   - 进入 GitHub Actions 页面
   - 点击失败的工作流
   - 查看详细日志

### 服务器无法启动

1. **检查环境变量**
   ```bash
   # 在服务器上检查
   pm2 logs maimai-api
   ```

2. **检查端口**
   ```bash
   # 检查端口是否被占用
   sudo netstat -tulpn | grep 3001
   ```

3. **手动重启**
   ```bash
   pm2 restart maimai-api
   ```

---

## 📚 相关文档

- `SERVER_DEPLOYMENT.md` - 详细的服务器部署指南
- `PRE_DEPLOYMENT_CHECKLIST.md` - 部署前检查清单
- `DEPLOYMENT_PROD.md` - 生产环境配置指南

---

## 💡 推荐配置

**对于大多数用户：**
- **前端**: Cloudflare Pages（已自动配置）✅
- **后端**: Railway（最简单，自动部署）⭐

**如果你需要更多控制：**
- **前端**: Cloudflare Pages（已自动配置）✅
- **后端**: VPS + PM2 + GitHub Actions（完全控制）⭐

---

## 🎉 完成！

配置完成后，你的工作流程将是：

1. 编写代码
2. 提交并推送到 GitHub
3. **自动部署前端和服务器** ✨
4. 完成！

无需手动操作，一切自动化！🚀

