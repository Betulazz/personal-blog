# 评论修复云端部署验收

Status: resolved
Date: 2026-10-02 (Asia/Shanghai)
Application commit: `d1539bc`
Target: `root@39.107.122.20`, `/opt/personal-blog`

## 发布结果

本次提交评论 Markdown 样式、显式已读确认、后台回复上下文/完整讨论侧栏、删除顺序
修复及回归测试。其他预先暂存的 particle-fidelity、个人博客规划文档和 opencode.json
保持原有暂存状态，未混入提交。

本机完成面向云端的 Nuxt 正式构建，最终产物压缩包 SHA256：
`89468ec9e85070cd298cd8ba7bcde1382fb9c0727eaa5cfff50db8ecd11ea418`。
仅传输提交中的改动文件及该完整产物，保留服务器 .env、证书、上传卷和 MySQL 卷。
云端构建新 backend/migrate 镜像和 prebuilt frontend 镜像后，显式执行迁移
`0017_github_comments → 0018_comment_read_receipts → 0019_prune_deleted_roots`，
更新后端/前端容器并重新加载 Nginx。四个服务均 healthy。

## 备份与回退材料

迁移前的数据库及上传文件备份：
`/root/backups/comments-20261001/20261001T154710Z-*`。
SHA256、gzip 完整性、上传 tar 可读取检查通过；数据库和上传备份已复制到本地临时
目录 `blog-comments-release-d1539bc/backup/comments-20261001`，再次校验通过。
本次没有执行恢复演练。

旧源码/前端产物备份：
`/root/backups/comments-20261001/before-d1539bc-source.tar.gz`。
旧前端 .output 另保留于 `before-d1539bc-output`；旧镜像分别标记为
`personal-blog-backend:before-comments-d1539bc` 和
`personal-blog-frontend:before-comments-d1539bc`。

## 线上证据及验证边界

- 正在运行的容器 Alembic head 为 `0019_prune_deleted_roots`。
  容器内 comments service/routes SHA256 与本地提交一致；服务器 16 项改动的
  运行文件逐项校验通过。
- 迁移前线上有 3 条评论，没有历史空主评论占位；迁移后这 3 条评论的原有字段
  指纹全部一致。没有人为平移历史时间。
- 实际 CommentService 验证：GET 列表不标已读，按当前页显式 ID 确认后未读数
  2 → 0，重复确认仍为 0；父评论摘要和完整讨论关系验证通过。
  此检查在外层事务中执行并回滚，独立验证原始 admin_read_at 全部恢复，线上
  原始未读数仍为 2，交由管理员正常阅读时清除。
- 通过真实 Nginx/FastAPI 的管理员鉴权请求验证列表、未读计数、评论 2/4 的
  完整讨论接口，均 HTTP 200。临时签名仅在服务器进程内使用，未打印令牌或更改
  管理员密码；未调用真实已读 POST 修改生产阅读状态。
- `docker/smoke.sh` HTTPS 匿名检查全部通过：健康、readiness、首页 SSR、未知上传
  404、非信任 Host 400、未登录后台 401、响应安全头和 HSTS。
  脚本的密码登录分支未执行；管理员 GET 由上面的独立真实鉴权检查覆盖。
- Playwright 直接打开真实线上 `/posts/testing`，未注入 CSS 或模拟接口。
  桌面和手机均验证正文 16px、H1 24px/700、H2 20.8px，标题层级正确，pageerror 为空。
  截图位于本地临时目录 `blog-comments-cloud-after.png` 及
  `blog-comments-cloud-after-mobile.png`。
- 发布后 backend/frontend 日志检查无 Traceback、Unknown column 或 HTTP 500。
- 删除顺序、当前页/并发新评论、读状态失败重试及后台侧栏交互由已通过的本地
  原生 MySQL/fixture E2E 回归覆盖（后端 19、单元 146、目标 E2E 16 加补验）。
  线上没有新增或删除测试评论，也没有进行管理员浏览器完整流程写入验收。

可重复服务验收工具：[cloud_acceptance.py](debug/cloud_acceptance.py)。旧诊断工具
cloud_probe.py 专用于 0017 时的问题复现，不应作为新版验收使用。
