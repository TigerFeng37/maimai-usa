# 🔒 Railway 持久化存储配置指南

## 📋 问题说明

默认情况下，Railway 容器在每次重新部署时会被销毁并重新创建，导致：
- ❌ 所有数据文件丢失（users.json, forum.json, peopleCount.json 等）
- ❌ Session 文件丢失，导致登录 cookies 失效
- ❌ 用户需要重新登录，收藏和论坛数据丢失

## ✅ 解决方案：使用 Railway Volume

Railway 提供了持久化卷（Volume）功能，可以将数据目录挂载到持久化存储中，即使容器重新部署，数据也会保留。

---

## 🚀 配置步骤

### 步骤 1: 创建 Volume

1. 在 Railway Dashboard 中，进入你的项目
2. 点击你的服务（Service）
3. 在左侧菜单中，点击 **"Volumes"** 标签
4. 点击 **"New Volume"** 按钮
5. 配置 Volume：
   - **Name**: `maimai-data`（或任何你喜欢的名称）
   - **Mount Path**: `/data`（这是容器内的挂载路径）
   - **Size**: 1 GB（对于 JSON 文件来说足够了，可以根据需要调整）
6. 点击 **"Create"** 创建 Volume

### 步骤 2: 配置环境变量

在服务的 **Variables** 标签页中，添加以下环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `DATA_DIR` | `/data` | 数据文件存储目录（必须与 Volume 的 Mount Path 一致） |
| `SESSIONS_DIR` | `/data/sessions` | Session 文件存储目录 |

**重要提示**：
- `DATA_DIR` 必须与 Volume 的 **Mount Path** 完全一致
- 如果 Mount Path 是 `/data`，则 `DATA_DIR` 应该设置为 `/data`
- `SESSIONS_DIR` 应该是 `DATA_DIR` 的子目录

### 步骤 3: 验证配置

1. **检查 Volume 挂载**：
   - 在 Railway Dashboard 中，进入服务的 **Volumes** 标签
   - 确认 Volume 状态为 **"Mounted"**
   - 确认 Mount Path 正确

2. **检查环境变量**：
   - 在 **Variables** 标签页中，确认 `DATA_DIR` 和 `SESSIONS_DIR` 已设置
   - 确认值正确（与 Volume Mount Path 匹配）

3. **重新部署服务**：
   - 点击 **"Deploy"** 或等待自动部署
   - 查看部署日志，确认没有错误

4. **测试数据持久化**：
   - 登录网站
   - 添加一些收藏
   - 创建一些论坛帖子
   - 触发一次重新部署（可以推送一个小的代码更改）
   - 验证数据是否保留

---

## 📁 目录结构

配置完成后，Volume 中的目录结构应该是：

```
/data/
├── users.json          # 用户数据
├── forum.json          # 论坛数据
├── peopleCount.json    # 人数统计数据
├── reports_*.json      # 报告数据（每个店铺一个文件）
└── sessions/           # Session 文件
    └── [session files]
```

---

## 🔧 故障排除

### 问题 1: 数据仍然丢失

**可能原因**：
- Volume 未正确挂载
- `DATA_DIR` 环境变量未设置或设置错误
- Mount Path 与 `DATA_DIR` 不匹配

**解决方法**：
1. 检查 Volume 状态是否为 "Mounted"
2. 检查环境变量 `DATA_DIR` 是否与 Volume Mount Path 一致
3. 查看服务器日志，确认数据目录路径
4. 在服务器日志中查找 "📁 Data directory" 和 "📁 Sessions directory" 的输出

### 问题 2: Session 仍然失效

**可能原因**：
- `SESSIONS_DIR` 未设置
- Session 目录权限问题
- Cookie 配置问题

**解决方法**：
1. 确认 `SESSIONS_DIR` 环境变量已设置
2. 检查 Cookie 配置（已在代码中修复）：
   - `secure: true`（生产环境）
   - `sameSite: 'none'`（跨域）
   - `httpOnly: true`
3. 确认前端和后端域名都使用 HTTPS

### 问题 3: 权限错误

**可能原因**：
- Volume 挂载路径权限不足

**解决方法**：
- Railway Volume 通常会自动处理权限问题
- 如果遇到权限错误，检查服务器日志
- 确保代码中有 `fs.mkdir(DATA_DIR, { recursive: true })` 来创建目录

---

## 💡 最佳实践

1. **定期备份**：
   - 虽然数据现在会持久化，但建议定期备份 Volume 数据
   - 可以通过 Railway CLI 或 API 导出数据

2. **监控存储使用**：
   - 定期检查 Volume 使用情况
   - 如果数据增长，考虑增加 Volume 大小

3. **环境变量管理**：
   - 确保所有环境（开发、生产）都正确配置
   - 使用 Railway 的环境变量模板功能

4. **测试部署**：
   - 在配置完成后，进行一次测试部署
   - 验证数据在重新部署后是否保留

---

## 📚 相关文档

- [Railway Volumes 官方文档](https://docs.railway.app/storage/volumes)
- `RAILWAY_SETUP.md` - Railway 部署完整指南
- `DEPLOYMENT_PROD.md` - 生产环境配置

---

## ✅ 配置检查清单

部署前确认：

- [ ] Volume 已创建并挂载
- [ ] `DATA_DIR` 环境变量已设置（与 Volume Mount Path 一致）
- [ ] `SESSIONS_DIR` 环境变量已设置
- [ ] Volume 状态为 "Mounted"
- [ ] 服务已重新部署
- [ ] 测试数据持久化（登录、添加收藏、重新部署、验证数据保留）
- [ ] 测试 Session 持久化（登录、重新部署、验证仍保持登录状态）

---

## 🎉 完成！

配置完成后，你的数据将：
- ✅ 在重新部署后保留
- ✅ Session 在重新部署后仍然有效
- ✅ 用户无需重新登录
- ✅ 收藏和论坛数据不会丢失

享受持久化存储带来的稳定性！🚀

