# 🚂 Railway 快速开始（5 分钟）

## ⚡ 超快速设置

### 1. 创建 Railway 项目（2 分钟）

1. 访问 https://railway.app
2. 点击 "Start a New Project" → "Login with GitHub"
3. 选择 "Deploy from GitHub repo"
4. 选择你的 `maimai-usa` 仓库

### 2. 配置服务（1 分钟）

1. 点击服务名称进入设置
2. **Settings → Build & Deploy**
   - Start Command: `npm run server`
   - Build Command: 留空

### 3. 设置环境变量（2 分钟）

在 **Variables** 标签页添加：

```bash
NODE_ENV=production
PORT=3001
DISCORD_CLIENT_ID=你的客户端ID
DISCORD_CLIENT_SECRET=你的客户端密钥
DISCORD_CALLBACK_URL=https://你的服务名.up.railway.app/auth/discord/callback
FRONTEND_URL=https://你的前端域名
SESSION_SECRET=运行 openssl rand -base64 32 生成
```

**生成 SESSION_SECRET：**
```bash
openssl rand -base64 32
```

### 4. 获取域名并更新配置

1. Railway 会自动分配域名（例如：`maimai-api.up.railway.app`）
2. 更新 `DISCORD_CALLBACK_URL` 为实际域名
3. 在 Discord Developer Portal 添加回调 URL
4. 更新前端的 `.env.production`：
   ```bash
   VITE_API_BASE_URL=https://你的railway域名.up.railway.app/api
   ```

### ✅ 完成！

现在每次推送代码，Railway 会自动部署！

---

## 📚 详细文档

查看 `RAILWAY_SETUP.md` 获取完整指南和故障排除。

---

## 🔍 验证部署

```bash
# 测试 API
curl https://你的railway域名.up.railway.app/api/forum
```

在 Railway Dashboard 查看部署日志和状态。

