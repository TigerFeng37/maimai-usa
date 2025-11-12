# 地点数据错误激活问题修复报告

## 问题概述

GitHub Actions 自动更新脚本错误地激活了 10 个不在 ALL.Net 网站上的地点，同时错误地停用了 1 个应该激活的地点。

## 受影响的地点

### 被错误激活（已修复）：
1. **APM** - Round1 Arlington Parks, TX ❌
2. **DBF** - Round1 Danbury Fair, CT ❌
3. **FSM** - Round1 Four Seasons Town Centre, Greensboro, NC ❌
4. **GLC** - Round1 Great Lakes Crossing, Auburn Hills, MI ❌
5. **GUR** - Round1 Gurnee Mills, IL ❌
6. **LVO** - Round1 Las Vegas South Premium Outlets, NV ❌
7. **PBO** - Round1 Westfield Plaza Bonita, National City, CA ❌
8. **RNO** - Round1 Meadowood Mall, Reno, NV ❌
9. **SLM** - Round1 Southland Mall, Hayward, CA ❌
10. **SVM** - Round1 Sunvalley Mall, Concord, CA ❌

### 被错误停用（已修复）：
1. **LAS** - Round1 Meadows Mall, Las Vegas, NV ✅

## 根本原因分析

### 1. 匹配阈值过低
- **问题**：匹配置信度阈值只需 70 分
- **后果**：州+城市匹配（80分）就能激活错误的地点
- **修复**：提高阈值到 95 分

### 2. 危险的 Failsafe 逻辑
- **问题**：当高置信度匹配失败时，使用简单的名称匹配作为后备
- **后果**：导致大量低质量的匹配
- **修复**：完全移除 failsafe 逻辑，只接受高置信度匹配

### 3. "永不停用"逻辑
- **问题**：一旦地点被激活，永远不会被停用
- **后果**：错误激活的地点会永久保持激活状态
- **修复**：允许正确的停用操作

### 4. 缺乏安全检查
- **问题**：没有验证匹配数量是否合理
- **后果**：可能导致大规模的错误激活/停用
- **修复**：添加最小匹配数检查（< 40 会中止）和大量停用警告（> 5 发出警告）

### 5. 危险的 Fallback 数据
- **问题**：抓取失败时使用过时的硬编码数据
- **后果**：使用不准确的数据继续更新
- **修复**：移除 fallback，抓取失败时直接中止更新

## 实施的修复

### ✅ 数据修复
- 回滚了 10 个错误激活的地点
- 重新激活了 1 个被错误停用的地点
- 当前激活地点数：**49 个**（修复前：58 个）

### ✅ 代码修复
1. **提高匹配阈值**：70 → 95
2. **移除危险的 failsafe**：不再使用低置信度名称匹配
3. **允许正确停用**：移除"永不停用"逻辑
4. **添加安全检查**：
   - 最小匹配数检查（< 40 中止）
   - 大量停用警告（> 5 警告）
5. **移除 fallback 数据**：抓取失败时中止更新
6. **改进日志**：正确记录激活和停用操作

## 预防措施

### 自动化保护
- ✅ 匹配数不足时自动中止更新
- ✅ 大量停用时发出明显警告
- ✅ 抓取失败时不使用过时数据
- ✅ 每次更新前自动备份原始数据

### 手动审查建议
1. 定期检查 GitHub Actions 的运行日志
2. 关注异常的激活/停用数量
3. 验证新激活的地点确实在 ALL.Net 上
4. 保留备份文件至少 30 天

## 测试结果

所有修复已通过测试：
- ✅ 地点数据回滚成功
- ✅ 脚本逻辑修复完成
- ✅ 无 linter 错误
- ✅ 安全检查机制就位

## 文件变更

- `src/r1index-geocoded.json` - 回滚错误激活
- `scripts/updateLocations.js` - 修复匹配逻辑和安全检查

---

**修复完成时间**：2025-11-12  
**修复状态**：✅ 完成
