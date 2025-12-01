# Discord Bot 快速设置指南

## 快速开始 (5分钟设置)

### 1. 创建 Discord Bot (2分钟)

1. 访问 https://discord.com/developers/applications
2. 点击 "New Application"，输入名称 (例如: "Maimai USA Bot")
3. 进入 "Bot" 页面，点击 "Add Bot"
4. **重要**: 复制 **Token** (点击 "Reset Token" 如果看不到)
5. 在 "OAuth2" > "URL Generator":
   - 勾选 `bot` 和 `applications.commands`
   - 勾选以下权限:
     - Send Messages
     - Use Slash Commands
     - Send Messages in DMs
   - 复制生成的邀请链接

### 2. 配置环境变量 (1分钟)

在项目根目录的 `.env` 文件中添加:

```env
# Discord Bot (必需)
DISCORD_BOT_TOKEN=你的_bot_token_粘贴这里
DISCORD_CLIENT_ID=你的_client_id (在 OAuth2 页面)

# 可选 - 用于快速测试 (公会命令立即生效)
DISCORD_GUILD_ID=你的_服务器_id (右键服务器 > 复制ID, 需要在 Discord 设置中启用开发者模式)

# API 配置 (必需)
API_BASE_URL=http://localhost:3001
FRONTEND_URL=https://maimai-usa.pages.dev

# 命令注册 (可选)
DISCORD_REGISTER_GLOBAL=true  # 设置为 true 以注册全局命令 (需要1小时生效)
```

### 3. 安装依赖并运行 (2分钟)

```bash
# 安装依赖
npm install
# 或
yarn install

# 启动后端服务器 (如果还没启动)
npm run server

# 在另一个终端启动 Discord Bot
npm run bot

# 在另一个终端启动通知服务
npm run notifier
```

### 4. 邀请 Bot 到服务器

使用步骤1中生成的邀请链接将 bot 邀请到你的 Discord 服务器。

### 5. 测试

1. 在 Discord 服务器中，输入 `/` 应该能看到 bot 的命令
2. 使用 `/store Round1 Burbank` 测试查看商店信息
3. 使用 `/favorite Round1 Burbank` 测试收藏商店

## 首次使用

**重要**: 用户必须先在你的网站上使用 Discord 登录一次，才能使用 bot 的收藏功能。

## 常见问题

### Q: Bot 没有响应命令

**A**: 
- 确保 bot 已在线 (查看服务器成员列表)
- 检查 `DISCORD_BOT_TOKEN` 是否正确
- 查看运行 bot 的终端是否有错误信息

### Q: 命令未显示

**A**: 
- 如果设置了 `DISCORD_GUILD_ID`，命令应该立即显示
- 如果只设置了 `DISCORD_REGISTER_GLOBAL=true`，全局命令需要最多1小时生效
- 尝试重新邀请 bot 到服务器

### Q: 无法添加收藏

**A**: 
- 确保用户已在网站上使用 Discord 登录一次
- 检查商店名称是否正确 (可以使用商店 ID 代替)
- 查看后端服务器是否正常运行

### Q: 收不到通知

**A**: 
- 确保通知服务正在运行 (`npm run notifier`)
- 检查用户是否允许 bot 发送私信 (Discord 设置 > 隐私 > 允许服务器成员发送私信)
- 通知服务每5分钟检查一次，可能会有延迟

## 生产环境部署

### 使用 PM2

```bash
# 安装 PM2
npm install -g pm2

# 启动所有服务
pm2 start server/index.js --name "maimai-api"
pm2 start server/bot/index.js --name "maimai-bot"
pm2 start server/notifier/index.js --name "maimai-notifier"

# 保存配置
pm2 save
pm2 startup
```

### 使用 Docker Compose

创建 `docker-compose.bot.yml`:

```yaml
version: '3.8'

services:
  bot:
    build:
      context: .
      dockerfile: Dockerfile.bot
    environment:
      - DISCORD_BOT_TOKEN=${DISCORD_BOT_TOKEN}
      - DISCORD_CLIENT_ID=${DISCORD_CLIENT_ID}
      - API_BASE_URL=http://api:3001
    restart: unless-stopped

  notifier:
    build:
      context: .
      dockerfile: Dockerfile.bot
    command: node server/notifier/index.js
    environment:
      - DISCORD_BOT_TOKEN=${DISCORD_BOT_TOKEN}
      - DISCORD_CLIENT_ID=${DISCORD_CLIENT_ID}
      - API_BASE_URL=http://api:3001
    restart: unless-stopped
```

## 监控和日志

查看 bot 状态:
```bash
# 如果使用 PM2
pm2 status
pm2 logs maimai-bot
pm2 logs maimai-notifier
```

## 需要帮助?

查看完整文档: [README_DISCORD_BOT.md](./README_DISCORD_BOT.md)

