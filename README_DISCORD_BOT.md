# Discord Bot - 商店收藏和通知系统

这个 Discord bot 允许用户收藏他们常去的商店，并在这些商店的论坛有新帖子时收到通知。

## 功能特性

- ✅ **收藏商店**: 使用 `/favorite <商店>` 命令收藏商店
- ✅ **取消收藏**: 使用 `/unfavorite <商店>` 命令取消收藏
- ✅ **查看收藏列表**: 使用 `/favorites` 命令查看你收藏的所有商店
- ✅ **查看商店信息**: 使用 `/store <商店>` 命令查看商店详情和最近的帖子
- ✅ **自动通知**: 当收藏的商店有新帖子时，自动发送 Discord 私信通知

## 设置步骤

### 1. 创建 Discord Bot 应用

1. 访问 [Discord Developer Portal](https://discord.com/developers/applications)
2. 点击 "New Application" 创建新应用
3. 进入 "Bot" 页面，点击 "Add Bot"
4. 复制 **Bot Token** (稍后需要)
5. 在 "OAuth2" > "URL Generator" 中：
   - 选择 `bot` 和 `applications.commands` 权限
   - 复制生成的邀请链接，用于邀请 bot 到你的服务器

### 2. 配置环境变量

在你的 `.env` 文件中添加以下环境变量：

```env
# Discord Bot 配置
DISCORD_BOT_TOKEN=你的_bot_token
DISCORD_CLIENT_ID=你的_client_id
DISCORD_GUILD_ID=你的_服务器_id (可选,用于快速注册公会命令)
DISCORD_REGISTER_GLOBAL=true # 设置为 true 注册全局命令 (需要1小时生效)

# API 配置
API_BASE_URL=http://localhost:3001 # 或你的生产环境 URL
FRONTEND_URL=https://maimai-usa.pages.dev # 或你的前端 URL
```

### 3. 安装依赖

```bash
npm install
# 或
yarn install
```

### 4. 运行 Bot

#### 开发模式 (仅命令处理)

```bash
npm run bot
# 或
yarn bot
```

#### 运行通知服务 (检查更新并发送通知)

```bash
npm run notifier
# 或
yarn notifier
```

#### 生产环境 (使用 PM2)

```bash
# 安装 PM2
npm install -g pm2

# 启动 bot
pm2 start server/bot/index.js --name "maimai-bot"

# 启动通知服务
pm2 start server/notifier/index.js --name "maimai-notifier"

# 保存 PM2 配置
pm2 save
pm2 startup
```

### 5. 邀请 Bot 到服务器

使用 Discord Developer Portal 生成的邀请链接将 bot 邀请到你的服务器。

## 使用说明

### 首次使用

1. **在网站上登录**: 用户需要先在网站 (https://maimai-usa.pages.dev) 上使用 Discord 登录一次，这样才能将 Discord 账户和网站账户关联起来。

2. **收藏商店**: 在 Discord 服务器中使用 `/favorite <商店名称或ID>` 命令

例如:
```
/favorite Round1 Arlington Parks
/favorite 21467
```

3. **接收通知**: 当收藏的商店有新帖子时，bot 会自动发送私信通知

### 命令列表

| 命令 | 描述 | 示例 |
|------|------|------|
| `/favorite <store>` | 收藏一个商店 | `/favorite Round1 Burbank` |
| `/unfavorite <store>` | 取消收藏 | `/unfavorite 21467` |
| `/favorites` | 查看收藏列表 | `/favorites` |
| `/store <store>` | 查看商店信息和最近的帖子 | `/store Round1 Arlington` |

## 技术架构

### 组件说明

1. **Discord Bot** (`server/bot/index.js`)
   - 处理用户命令
   - 管理收藏列表
   - 提供商店信息查询

2. **通知服务** (`server/notifier/index.js`)
   - 定期检查论坛新帖子 (每5分钟)
   - 向收藏相关商店的用户发送通知
   - 跟踪已发送的通知以避免重复

3. **API 端点** (`server/routes/favorites.js`)
   - `GET /api/favorites` - 获取用户的收藏列表
   - `POST /api/favorites` - 添加收藏
   - `DELETE /api/favorites/:storeId` - 移除收藏
   - `GET /api/favorites/users/:discordUserId` - 通过 Discord ID 获取收藏 (bot 使用)

### 数据流程

```
用户登录网站 (Discord OAuth)
    ↓
用户账户关联 Discord ID
    ↓
用户在 Discord 中使用 /favorite 命令
    ↓
Bot 调用 API 添加收藏
    ↓
通知服务定期检查新帖子
    ↓
发现新帖子 → 查找收藏该商店的用户
    ↓
通过 Discord 私信发送通知
```

## 故障排除

### Bot 无法响应命令

- 确保 bot 已邀请到服务器并在线
- 检查 `DISCORD_BOT_TOKEN` 是否正确
- 查看控制台错误信息

### 命令未显示

- 全局命令需要最多1小时生效
- 使用 `DISCORD_GUILD_ID` 设置可以立即测试 (仅限指定服务器)
- 尝试重新邀请 bot 并授予权限

### 无法添加收藏

- 确保用户已在网站上登录一次 (使用 Discord 登录)
- 检查商店名称或 ID 是否正确
- 查看 API 是否正常运行

### 收不到通知

- 确保通知服务正在运行
- 检查用户是否允许 bot 发送私信
- 查看通知服务的日志输出
- 确认商店确实有新帖子

## 环境变量说明

| 变量 | 必需 | 说明 |
|------|------|------|
| `DISCORD_BOT_TOKEN` | ✅ | Discord bot token |
| `DISCORD_CLIENT_ID` | ✅ | Discord 应用 client ID |
| `DISCORD_GUILD_ID` | ❌ | 测试服务器 ID (可选) |
| `DISCORD_REGISTER_GLOBAL` | ❌ | 是否注册全局命令 |
| `API_BASE_URL` | ✅ | 后端 API 地址 |
| `FRONTEND_URL` | ✅ | 前端网站地址 |

## 开发建议

- 使用 `DISCORD_GUILD_ID` 进行本地测试，命令会立即生效
- 查看控制台日志了解 bot 运行状态
- 使用 PM2 在生产环境中管理进程
- 定期检查通知服务是否正常运行

## 注意事项

- Bot 需要以下权限: `Send Messages`, `Use Slash Commands`, `Send Messages in DMs`
- 用户必须先在网站上登录才能使用 bot 功能
- 通知服务每5分钟检查一次更新，可能会有延迟
- 用户需要允许 bot 发送私信才能收到通知

