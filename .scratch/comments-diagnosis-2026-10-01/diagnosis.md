# 评论渲染、未读提醒与后台回复关系

Date: 2026-10-01
Status: diagnosed
Scope: 云端诊断已完成；修复方案待用户确认，尚未修改应用或部署。

## 已验证事实

环境：`root@39.107.122.20`，目录 `/opt/personal-blog`，Docker Compose 的
frontend/backend/mysql/nginx 四个服务均 healthy。云端目录没有 Git 元数据，
不能用本地 HEAD 代表云端版本。相关四份源码 SHA256 与本地一致，运行中的
backend `app/services/comments.py` 哈希也一致。

### 1. Markdown 标题没有视觉层级

真实公开页面 `https://39.107.122.20/posts/testing` 的评论内容已包含 h1、h2。
浏览器计算样式却是正文/H1/H2 全部 16px，标题字重 400。页面无 pageerror。
服务端真实渲染函数能输出 h1、strong、ul、pre/code，因而当前复现的标题问题
发生在页面排版层，不是 Markdown 转换失败。

`frontend/app/assets/css/main.css` 导入 Tailwind；公开评论正文与后台评论正文
没有恢复标题和列表等 Markdown 排版的完整样式。测试浏览器仅添加标题样式后，
正文/H1/H2 为 16/24/20px，H1 字重 700，同一测试变绿。这个实验未修改服务器。

建议：公开正文、公开预览、后台正文共用局部评论 Markdown 排版样式；检查标题、
列表、引用、代码块、分隔线、链接，继续遵守现有安全清洗与媒体禁用规则。
当前尚未逐项验收这些其他语法，不把标题实验当成完整 Markdown 验收。

### 2. 未读提醒存在真实后端计数错误

调用运行中服务的 `list_admin_comments(1, 20)` 后，实际 `unread_comment_count()`
依旧返回 2。诊断使用外层数据库事务与 `join_transaction_mode='rollback_only'`，
服务内的 commit 不提交外层事务；最终回滚并核对已读标记恢复。

证据：

| 字段 | 实测值 |
| --- | --- |
| 数据库 CURRENT_TIMESTAMP / UTC_TIMESTAMP | 2026-10-01 08:27:14 / 08:27:14 |
| 应用 UTC | 2026-10-01 08:27:14 UTC |
| 持久化 last_seen_at | 2026-10-01 08:21:16 |
| 读者评论 #1 created_at | 2026-10-01 14:16:03 |
| 读者回复 #2 created_at | 2026-10-01 14:54:19 |
| 博主回复 #4 created_at | 2026-10-01 08:14:10 |

两条旧读者评论相对当前 UTC 时间处于未来。服务用应用 UTC 写 last_seen_at，
然后以 `created_at > last_seen_at` 计数，因此阅读无法清除这两条记录。
仅在回滚事务内将游标对齐到已检查记录时间后，计数变为 0。
历史记录出现时间偏差的来源尚未证明，不能断言是本地数据导入或特定旧配置。

建议：先确认“已读”语义，再设计不依赖历史时间混用的已读游标或显式已读状态；
记录集合必须以成功读取到的快照为界，并验证并发新评论、跨页、列表失败、
离开页面、刷新和重新登录。不应把全表统一加减 8 小时作为修复：现有博主回复
时间已使用当前 UTC 基准。已有时间展示偏差应单独核对，不能因红点消失就认定修复。

前端 AdminShell 在评论页面把提示数设成 0，离开页面再次读取后台计数，
因此会重新出现。前端请求竞态尚未单独复现；当前后端返回 2 已足以解释症状。

### 3. 后台回复缺少原评论上下文

后台按所有评论 `created_at DESC, id DESC` 平铺分页（每页 20 条）。回复卡片
唯一关系提示为“回复评论 #编号”；API 没有父评论作者/摘要，也没有补查父评论。
父评论落在其他页时依旧只显示 ID。公开页面只分页根评论，并在每个根下面缩进
展示全部回复，所以公开关系更明确。

后台允许对回复再次发布回复，但服务会将 parent_id 归一到最上层原评论，
没有保存直接点击的回复对象。现有 CONTEXT 和评论 spec 都规定一层回复。
增加“直接回复 @某人”需要明确数据语义；旧记录无法完整恢复直接对象。

## 已确认设计树

- Q1：保留最新评论平铺；回复卡片增加原评论作者和摘要。
- Q2：评论列表成功加载即已读。
- Q3：本次仅完成诊断与方案文档。
- Q4：保持一层回复，明确回复原评论，不新增直接回复对象字段。
- Q5：仅成功加载的当前页评论已读；其他页未读继续提示。
- Q6：“查看完整讨论”打开后台侧栏，展示原评论和全部回复。

上述选择均来自用户答复。已在 CONTEXT 补充 Root Comment / Comment Reply 定义；
具体实现与验收见同目录 spec.md。方案整体理解确认后可作为后续实现依据。
本次未新增 ADR：这些选择不满足难以逆转且存在重大架构权衡的条件。

## 重放命令

从仓库根目录运行：

```powershell
Get-Content -Raw .scratch/comments-diagnosis-2026-10-01/debug/cloud_probe.py |
  ssh -o BatchMode=yes root@39.107.122.20 'cd /opt/personal-blog && docker compose exec -T backend python -'
node .scratch/comments-diagnosis-2026-10-01/debug/browser-probe.cjs
node .scratch/comments-diagnosis-2026-10-01/debug/browser-probe.cjs --css-probe
```

前两条在当前错误存在时退出码 1；第三条只是临时浏览器样式实验，退出码 0。
数据库探针可能短暂锁住已读标记；并发管理员阅读可能使恢复核对报错，应在空闲时重放。
探针依赖现有云端样例；删除样例或更换页面后需调整，不能当成长期自动化回归测试。
截图保存在本机临时目录；调试脚本明确归档在 debug 目录，无调试日志进入应用。

## 工作区保护

本次新增本目录并补充 CONTEXT 的两个领域术语。已有 staged 文件保持原状，
未 stage、commit、发布或永久写入云端数据。
