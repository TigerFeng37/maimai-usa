# 🚀 生产环境部署前检查清单

在推送到 GitHub 并部署到生产环境之前，请完成以下检查：

## 🔒 1. 安全性检查

### 环境变量和敏感信息
- [ ] **确认 `.env` 文件在 `.gitignore` 中**（已确认 ✅）
- [ ] **确认没有 `.env` 文件被提交到 Git**
  ```bash
  git ls-files | grep -E "\.env$|\.env\."
  # 应该没有输出，如果有输出说明有 .env 文件被跟踪了
  ```
- [ ] **检查代码中是否有硬编码的敏感信息**（已检查 ✅ - 所有敏感信息都使用环境变量）
- [ ] **确认 `server/data/` 目录在 `.gitignore` 中**（已确认 ✅）

### 默认值检查
- [ ] **检查 `server/index.js` 中的默认 SESSION_SECRET**
  - 当前默认值：`'your-secret-key-change-this-in-production'`
  - ⚠️ **生产环境必须设置强密码的 `SESSION_SECRET`**

## 📦 2. 代码完整性检查

### 未提交的文件
根据 `git status`，以下文件需要处理：

**已修改的文件：**
- [ ] `.github/workflows/update-locations.yml` - GitHub Actions 工作流
- [ ] `scripts/updateLocations.js` - 位置更新脚本
- [ ] `server/index.js` - 服务器主文件
- [ ] `src/DetailView.jsx` - 详情视图组件
- [ ] `src/MapView.jsx` - 地图视图组件
- [ ] `src/components/AuthButton.jsx` - 认证按钮组件
- [ ] `src/components/BookmarkPanel.jsx` - 书签面板组件
- [ ] `src/components/FavoriteButton.jsx` - 收藏按钮组件
- [ ] `src/components/Forum.jsx` - 论坛组件

**未跟踪的文件：**
- [ ] `server/routes/peopleCount.js` - 人数统计路由（新功能）
- [ ] `src/assets/discord.svg` - Discord 图标
- [ ] `src/utils/peopleCountApi.js` - 人数统计 API 工具

**建议：**
```bash
# 检查这些新文件是否需要提交
git add server/routes/peopleCount.js
git add src/assets/discord.svg
git add src/utils/peopleCountApi.js

# 或者如果不需要，添加到 .gitignore
```

## 🔧 3. GitHub Actions 配置

### 必需的 Secrets
在 GitHub 仓库设置中配置以下 secrets（Settings → Secrets and variables → Actions）：

- [ ] **`CLOUDFLARE_API_TOKEN`** - Cloudflare API Token
  - 获取方式：Cloudflare Dashboard → My Profile → API Tokens → Create Token
  - 需要权限：Account → Cloudflare Pages → Edit
  
- [ ] **`CLOUDFLARE_ACCOUNT_ID`** - Cloudflare Account ID
  - 获取方式：Cloudflare Dashboard → 右侧边栏可以看到 Account ID
  
- [ ] **`CLOUDFLARE_PROJECT_NAME`** - Cloudflare Pages 项目名称
  - 例如：`maimai-usa` 或你的项目名称

- [ ] **`GITHUB_TOKEN`** - 通常自动提供，但确保有 `contents: write` 权限

### 工作流权限
- [ ] 确认工作流文件中的权限设置正确：
  ```yaml
  permissions:
    contents: write  # 用于自动提交更改
    actions: read
    deployments: write
  ```

## 🌐 4. 生产环境配置

### 后端环境变量（生产服务器）
在生产服务器上创建 `.env` 文件，包含：

- [ ] **`DISCORD_CLIENT_ID`** - Discord 应用客户端 ID
- [ ] **`DISCORD_CLIENT_SECRET`** - Discord 应用客户端密钥
- [ ] **`DISCORD_CALLBACK_URL`** - 生产环境回调 URL
  - 格式：`https://api.yourdomain.com/auth/discord/callback`
- [ ] **`FRONTEND_URL`** - 前端生产 URL
  - 格式：`https://yourdomain.com`（无尾部斜杠）
- [ ] **`SESSION_SECRET`** - 强随机字符串（32+ 字符）
  - 生成命令：`openssl rand -base64 32`
- [ ] **`NODE_ENV=production`** - 必须设置为 production
- [ ] **`PORT`** - 服务器端口（通常 3001）
- [ ] **`VITE_API_BASE_URL`** - API 基础 URL（仅用于构建时）

### 前端环境变量（构建时）
创建 `.env.production` 文件用于构建：

- [ ] **`VITE_API_BASE_URL`** - 生产环境 API URL
  - 格式：`https://api.yourdomain.com/api`

### Discord 应用配置
- [ ] 在 [Discord Developer Portal](https://discord.com/developers/applications) 中添加生产环境回调 URL
- [ ] 确保同时保留开发和生产环境的回调 URL（可以同时存在）

## 🏗️ 5. 构建和部署配置

### Vite 配置
- [ ] 确认 `vite.config.js` 中的 `base` 路径正确
- [ ] 如果使用子路径部署，需要调整 `base` 值

### 构建测试
- [ ] 在本地测试生产构建：
  ```bash
  npm run build
  npm run preview
  ```
- [ ] 检查构建输出是否有错误
- [ ] 确认所有资源路径正确

### Cloudflare Pages 配置
- [ ] 确认 Cloudflare Pages 项目已创建
- [ ] 确认构建命令：`npm run build`
- [ ] 确认输出目录：`dist`
- [ ] 确认 Node.js 版本（建议 18+）

## 📝 6. 代码质量检查

### Linting
- [ ] 运行 linting 检查：
  ```bash
  npm run lint
  ```
- [ ] 修复所有 linting 错误

### 功能测试
- [ ] 测试认证功能（Discord 登录）
- [ ] 测试论坛功能
- [ ] 测试收藏功能
- [ ] 测试人数统计功能（如果已实现）
- [ ] 测试位置数据更新

## 🔍 7. 最终检查

### Git 状态
- [ ] 检查是否有未提交的更改：
  ```bash
  git status
  ```
- [ ] 确认所有需要的文件都已暂存
- [ ] 确认没有敏感文件被意外添加

### 提交信息
- [ ] 编写清晰的提交信息
- [ ] 如果这是生产部署，考虑使用标签：
  ```bash
  git tag -a v1.0.0 -m "Production release v1.0.0"
  ```

### 推送前确认
- [ ] 确认要推送到正确的分支（通常是 `main` 或 `master`）
- [ ] 确认远程仓库地址正确
- [ ] 如果有 CI/CD，确认工作流会正确触发

## 🚨 常见问题

### 如果忘记设置环境变量
生产环境会出现以下问题：
- 认证失败（Discord OAuth）
- CORS 错误
- Session 不安全
- API 调用失败

### 如果 GitHub Actions 失败
检查：
1. Secrets 是否正确配置
2. Cloudflare 项目名称是否正确
3. 工作流文件语法是否正确
4. 查看 Actions 日志获取详细错误信息

### 如果部署后功能不工作
1. 检查浏览器控制台错误
2. 检查网络请求是否成功
3. 确认环境变量在生产环境正确设置
4. 确认 HTTPS 已启用（生产环境必需）

## 📚 相关文档

- `DEPLOYMENT_PROD.md` - 详细的生产环境设置指南
- `PROD_ENV_QUICKREF.md` - 生产环境变量快速参考
- `DEPLOYMENT.md` - 部署指南
- `README_AUTH.md` - 认证功能文档

## ✅ 完成检查后

当所有项目都检查完毕：

1. **提交更改**：
   ```bash
   git add .
   git commit -m "准备生产环境部署"
   ```

2. **推送到 GitHub**：
   ```bash
   git push origin master
   # 或
   git push origin main
   ```

3. **监控部署**：
   - 查看 GitHub Actions 运行状态
   - 检查 Cloudflare Pages 部署日志
   - 测试生产环境功能

4. **验证部署**：
   - 访问生产环境 URL
   - 测试所有主要功能
   - 检查控制台是否有错误

---

**重要提示**：在生产环境部署后，定期检查日志和监控，确保一切正常运行。

