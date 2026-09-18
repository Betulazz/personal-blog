# 个人博客系统开发规格说明

## 1. 项目定位

开发一个前后端分离的个人博客系统。

项目在视觉设计、美术风格、动画语言、空间层次、组件风格等方面，以 **XingHuiSamaBlogs / xinghuisama.top** 为主要视觉参考。

本项目不是对原仓库进行直接移植，也不是将 React 代码机械转换成 Vue，而是：

1. 分析原项目的 Design System；
2. 提取其视觉语言；
3. 使用 Vue / Nuxt 技术栈重新实现；
4. 根据新项目需求重新设计信息架构和代码架构；
5. 保留核心博客体验；
6. 删除不需要的功能；
7. 改善响应式、性能、可维护性和可扩展性。

---

# 2. 项目目标

主要目标：

- 高质量个人博客展示；
- 保留原站独特的深色、星空、毛玻璃视觉风格；
- PC 与移动端均具有良好的视觉效果；
- 支持 Markdown 文章写作；
- 提供独立后台管理系统；
- 前后端完全解耦；
- 后端提供规范 REST API；
- 数据统一存储于 MySQL；
- 支持 Docker 部署；
- 代码结构清晰，适合长期维护；
- 页面动画流畅，但避免为了视觉效果牺牲性能。

不追求：

- 社交平台级复杂功能；
- 微服务；
- 分布式架构；
- 复杂游戏化系统；
- 过早引入 Redis / Elasticsearch / MQ；
- 为炫技使用不必要的 Three.js 场景。

---

# 3. 明确删除的原站功能

以下页面及其相关组件、API、数据库模型均不需要开发：

- 照片墙；
- 灵境页面。

不要因为原仓库存在这些实现而重新加入项目。

如果原项目的其他模块依赖上述功能，应解除依赖，而不是保留隐藏实现。

---

# 4. 页面范围

## 4.1 前台页面

### 4.1.1 首页 `/`

首页是整个网站视觉表现最重要的页面。

主要区域：

- 全局动态背景；
- 顶部导航；
- Hero / 个人信息区域；
- 个人简介；
- 社交链接；
- 网站统计；
- 最新文章；
- 最近动态；
- 最近杂谈；
- 精选项目；
- 音乐播放器；
- 页脚。

可以参考原站的信息密度和卡片布局，但不要求逐像素复制。

首页重点体现：

- 深色空间感；
- 毛玻璃；
- 层级；
- 光效；
- 微动画；
- 卡片之间的视觉关联。

---

## 4.1.2 文章列表 `/posts`

功能：

- 文章列表；
- 分页；
- 分类筛选；
- 标签筛选；
-关键词搜索；
- 发布时间；
- 更新时间；
- 摘要；
- 封面；
- 阅读量；
- 置顶状态。

支持：

- Skeleton；
- Empty State；
- Loading State；
- Error State。

---

## 4.1.3 文章详情 `/posts/[slug]`

包括：

- 标题；
- 摘要；
- 封面；
- 发布时间；
- 更新时间；
- 分类；
- 标签；
- 阅读量；
- Markdown 正文；
- 代码高亮；
- 数学公式；
- 图片；
- 引用；
- 表格；
- TOC；
- 上一篇 / 下一篇；
- 返回顶部。

桌面端建议提供：

- Sticky TOC；
- 阅读进度。

移动端 TOC 使用 Drawer / Sheet。

---

# 4.1.4 分类 `/categories`

显示全部文章分类。

进入：

`/categories/[slug]`

显示对应分类文章。

---

# 4.1.5 标签 `/tags`

显示标签集合。

进入：

`/tags/[slug]`

显示对应标签文章。

标签视觉可以采用：

- Glass pill；
- 半透明边框；
- Hover Glow。

---

# 4.1.6 搜索 `/search`

支持搜索：

- 标题；
- 摘要；
- 正文；
- 标签。

第一阶段直接使用 MySQL 搜索。

暂时不要接入：

- Elasticsearch；
- Meilisearch；
- Algolia。

未来有需求再扩展。

---

# 4.1.7 动态 / 说说 `/moments`

对应偏生活化、轻内容的信息流。

每条动态可包含：

- 正文；
- 图片；
- 发布时间；
- 地点；
- 心情；
- 标签。

展示采用 Timeline / Card Feed。

这是偏个人动态的信息流，而不是完整文章系统。

---

# 4.1.8 杂谈 `/chatter`

用于记录短篇但比 Moments 更正式的内容。

支持：

- 标题；
- 正文；
- 标签；
- 时间；
- 心情；
- 搜索；
- 标签过滤。

在信息定位上：

`Posts`

属于正式长文章。

`Chatter`

属于碎片化思想 / 技术记录。

`Moments`

属于生活动态。

三者不要混为一个数据模型。

---

# 4.1.9 项目 `/projects`

显示个人项目。

项目字段：

- 名称；
- 描述；
- Logo / Cover；
- 技术栈；
- GitHub URL；
- Demo URL；
- 状态；
- 是否精选；
- 开发时间。

项目状态例如：

- Developing；
- Active；
- Archived。

---

# 4.1.10 友链 `/friends`

功能：

- 友链展示；
- 网站头像；
- 名称；
- 描述；
- URL；
- 在线状态可暂缓。

第一阶段不需要自动检测在线状态。

可以提供：

- 友链申请说明；
- 本站友链信息。

后续再决定是否做自动申请系统。

---

# 4.1.11 关于 `/about`

包含：

- 个人简介；
- 技术栈；
- 兴趣方向；
- 网站介绍；
- 时间线；
- 联系方式；
- 社交链接。

这一页允许适当强化视觉表达。

---

# 4.1.12 404

自定义 404 页面。

需要继承整体视觉体系。

不要使用 Nuxt 默认 404 外观。

---

# 5. 后台页面范围

统一位于：

`/admin`

后台视觉无需完全复刻前台。

后台优先：

- 清晰；
- 高效；
- 易操作。

---

## 5.1 登录

`/admin/login`

支持：

- 用户名 / 邮箱；
- 密码；
- 登录状态。

---

# 5.2 Dashboard

`/admin`

展示：

- 文章总数；
- 已发布；
- 草稿；
- 动态数量；
- 杂谈数量；
- 项目数量；
- 友链数量；
- 总阅读量；
- 最近编辑内容。

第一版不要开发复杂的数据可视化系统。

---

# 5.3 文章管理

`/admin/posts`

支持：

- 新建；
- 编辑；
- 删除；
- 发布；
- 撤回；
- 置顶；
- 搜索；
- 分类筛选；
- 状态筛选。

---

# 5.4 文章编辑器

`/admin/posts/new`

`/admin/posts/[id]/edit`

采用：

Tiptap + Markdown

要求：

- Markdown 为持久化核心格式；
- 编辑体验可以使用 Tiptap；
- 支持图片；
- Heading；
- Quote；
- Code Block；
- Link；
- Table；
- Preview。

不要只保存不可迁移的编辑器专属 JSON。

---

# 5.5 分类管理

`/admin/categories`

CRUD。

---

# 5.6 标签管理

`/admin/tags`

CRUD。

---

# 5.7 Moments 管理

`/admin/moments`

CRUD。

---

# 5.8 Chatter 管理

`/admin/chatter`

CRUD。

---

# 5.9 Projects 管理

`/admin/projects`

CRUD。

---

# 5.10 Friends 管理

`/admin/friends`

CRUD。

---

# 5.11 媒体管理

`/admin/media`

功能：

- 上传；
- 查看；
- 删除；
- 获取 URL。

第一阶段可以只实现图片。

---

# 5.12 网站设置

`/admin/settings`

配置：

- 网站标题；
- 网站副标题；
- Avatar；
- Favicon；
- Hero 描述；
- 社交链接；
- ICP 等页脚信息；
- 默认 SEO；
- 音乐播放器；
- 首页模块显示开关。

---

# 6. 技术栈

## 6.1 Frontend

核心：

- Nuxt 4；
- Vue 3；
- TypeScript。

Nuxt 用于：

- SSR；
- SEO；
- 文件路由；
- 页面 Metadata；
- Server Rendering；
- Route Rules；
- 前端工程组织。

---

## 6.2 CSS

采用：

**Tailwind CSS 4**

原则：

Tailwind 负责 Design Token 和 Utility。

不要把整个 UI 构建成大量不可维护的长 Class String。

复杂组件允许：

- `<style scoped>`；
- CSS Variables；
- composable class utilities。

---

# 6.3 UI

推荐：

**shadcn-vue + Reka UI**

主要使用：

- Dialog；
- Sheet；
- Dropdown；
- Tooltip；
- Popover；
- Select；
- Tabs；
- Toast；
- Command；
- Form primitives。

这些组件主要解决：

- Accessibility；
- Interaction；
- Keyboard navigation；
- Focus management。

不要直接采用组件库默认视觉作为网站视觉。

---

# 6.4 Icons

Lucide Vue Next。

尽量统一 Icon Style。

不要混用大量不同图标库。

---

# 6.5 Animation

主要：

**Motion for Vue / motion-v**

用于：

- 页面进入；
- Card Hover；
- Element Reveal；
- Layout Transition；
- Modal；
- Navigation；
- Micro-interaction。

复杂动画必要时再增加：

GSAP。

第一阶段不要同时大量使用两个动画系统。

---

# 6.6 State

Pinia。

只把真正跨页面、跨组件的数据放 Pinia。

不要把所有 API 数据都放全局 Store。

---

# 6.7 Utility

VueUse。

---

# 6.8 Markdown

建议：

- markdown-it 或 unified / remark；
- Shiki；
- KaTeX。

需要支持：

- GFM；
- Code Highlight；
- Heading Anchor；
- TOC；
- Math；
- External Link；
- Lazy Image。

---

# 6.9 Editor

Tiptap。

---

# 7. Backend

采用：

**FastAPI**

Python：

推荐 Python 3.12+。

核心：

- FastAPI；
- SQLAlchemy 2；
- Pydantic 2；
- Alembic。

---

# 7.1 数据库驱动

MySQL 异步驱动优先：

`asyncmy`

SQLAlchemy：

`AsyncSession`

---

# 7.2 Backend Architecture

采用：

```text
Router
  ↓
Service
  ↓
Repository
  ↓
SQLAlchemy
  ↓
MySQL
```

目录建议：

```text
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   ├── core/
│   ├── models/
│   ├── schemas/
│   ├── repositories/
│   ├── services/
│   ├── db/
│   ├── utils/
│   └── main.py
│
├── alembic/
├── tests/
├── pyproject.toml
└── .env.example
```

不要：

```text
Router → 直接写全部 SQL 和业务逻辑
```

---

# 8. Database

采用：

**MySQL 8**

Charset：

`utf8mb4`

推荐 Collation：

`utf8mb4_0900_ai_ci`

---

# 8.1 核心数据表

第一版：

```text
users

posts
categories
tags
post_tags

moments
moment_images

chatters
chatter_tags

projects

friends

media

site_settings
```

必要时：

```text
post_views
```

但避免过度设计。

---

# 9. Authentication

后台使用：

JWT

但 Token 应优先：

**HttpOnly Cookie**

而不是长期存储在 localStorage。

需要：

- Access Token；
- Refresh Token；
- Password Hash；
- Logout；
- Refresh；
- Current User。

密码 Hash：

Argon2 或 bcrypt。

---

# 10. API

统一：

`/api/v1`

例如：

```text
GET    /api/v1/posts
GET    /api/v1/posts/{slug}

POST   /api/v1/admin/posts
PATCH  /api/v1/admin/posts/{id}
DELETE /api/v1/admin/posts/{id}
```

Pydantic Response Schema 统一返回结构。

需要合理使用：

- HTTP Status；
- Pagination；
- Validation；
- Exception Handling。

---

# 11. 文件存储

开发阶段：

Local Storage。

生产环境：

S3 Compatible Object Storage。

通过 Storage Adapter 抽象。

避免业务代码与某一个对象存储供应商直接耦合。

---

# 12. 视觉设计规范

## 12.1 总体风格

主要关键词：

```text
Dark
Glassmorphism
Deep Space
Ambient Glow
Dreamy
Anime-inspired
Cyber
Soft Neon
Layered
Immersive
```

但是：

不要做成典型 Cyberpunk。

整体应更加：

- 柔和；
- 安静；
- 有空间感；
- 有一点梦幻感。

---

# 12.2 Design System 优先

开发页面之前必须先建立：

```text
Design Tokens
↓
Primitive Components
↓
Composite Components
↓
Business Components
↓
Pages
```

禁止：

先写 Home.vue，再复制样式到其他页面。

---

# 12.3 Color

避免大量纯：

`#000000`

背景使用：

- 深蓝黑；
- 靛青黑；
- 紫蓝黑。

Accent 主要来自：

- Cyan；
- Blue；
- Violet；
- Pink。

颜色数量必须克制。

---

# 12.4 Glass

所有主要 Card 使用统一 Glass Token。

包括：

- Background opacity；
- Border；
- Blur；
- Shadow；
- Saturation；
- Highlight。

例如定义：

```text
--glass-bg
--glass-bg-hover
--glass-border
--glass-border-hover
--glass-blur
--glass-shadow
```

不要每个组件自己定义一套 Glass CSS。

---

# 12.5 Radius

建立固定 Radius Scale：

```text
small
medium
large
panel
round
```

卡片整体偏大圆角。

但不要所有元素都无限圆角。

---

# 12.6 Shadow

Shadow 主要体现：

- Depth；
- Ambient Glow。

不要使用传统 Bootstrap 风格灰色 Drop Shadow。

---

# 12.7 Background

全局背景由多个低成本图层组成：

```text
Base Gradient
+
Radial Glow
+
Noise
+
Stars / Particles
+
Ambient Light
```

优先实现：

- CSS；
- Canvas。

不默认使用 Three.js。

---

# 12.8 Typography

正文阅读体验优先。

需要建立：

```text
Display
H1
H2
H3
Body
Small
Caption
Mono
```

中文与英文必须同时测试。

正文不能为了视觉风格：

- 字太细；
- 对比度过低；
- 行距太紧。

---

# 12.9 Animation

动画理念：

**Micro-interaction > Large Animation**

重点：

- Card hover；
- Button feedback；
- Navigation transition；
- Page transition；
- Scroll reveal；
- Image zoom；
- Dialog。

动画时长保持克制。

禁止：

每个元素独立不停运动。

---

# 12.10 Hover

桌面设备：

Card Hover：

```text
translateY
+
border glow
+
shadow increase
+
background brighten
```

幅度必须小。

不要：

`scale(1.1)`。

---

# 12.11 Mobile

移动端不是简单把桌面 Card 堆成一列。

需要专门处理：

- Navigation；
- Hero；
- TOC；
- Music Player；
- Grid；
- Padding；
- Font size；
- Touch target。

断点至少检查：

```text
375px
430px
768px
1024px
1440px
1920px
```

---

# 13. Performance Rules

重要。

视觉复刻不能建立在严重性能损耗基础上。

必须：

- lazy image；
- dynamic import；
- route-level splitting；
- 减少常驻动画；
- 减少大面积 backdrop-filter；
- 控制 Blur；
- 避免多个大型 Canvas；
- 对手机减少粒子；
- 尊重 prefers-reduced-motion。

目标：

PC 中高端设备稳定流畅。

移动端不能因为背景特效明显掉帧。

---

# 14. SEO

需要实现：

- title；
- description；
- canonical；
- OpenGraph；
- Twitter Card；
- sitemap；
- robots.txt；
- JSON-LD。

文章需要动态 Metadata。

---

# 15. Responsive

采用 Mobile First。

但开发顺序可以：

Desktop Reference
→ Tablet
→ Mobile refinement

视觉验收必须同时包含 Desktop / Mobile。

---

# 16. Error Handling

前端统一：

- API Error；
- Empty；
- Loading；
- Offline；
- 404；
- 500。

后端：

统一 Exception Handler。

禁止直接向客户端暴露：

- Traceback；
- SQL Error；
- Secret；
- Internal Path。

---

# 17. Security

必须：

- 环境变量管理 Secret；
- `.env` 不提交；
- 提供 `.env.example`；
- 密码 Hash；
- CORS 白名单；
- Upload File Type Validation；
- Upload Size Limit；
- SQLAlchemy Parameterization；
- HTML Sanitization；
- XSS Protection。

Markdown 渲染必须考虑 XSS。

---

# 18. Testing

第一阶段至少覆盖：

Backend：

- Auth；
- Post CRUD；
- Category；
- Tag；
- Publish state。

Frontend E2E：

使用 Playwright。

检查：

- 首页；
- 文章列表；
- 文章详情；
- Login；
- 后台文章发布。

---

# 19. Browser Visual Validation

Codex 开发时必须实际打开页面检查。

推荐开发循环：

```text
实现
↓
启动服务
↓
Playwright / Browser
↓
Desktop Screenshot
↓
Mobile Screenshot
↓
分析错位
↓
修改
↓
再次验证
```

不能只通过阅读代码判断页面正确。

---

# 20. 项目结构

建议 Monorepo：

```text
personal-blog/
├── frontend/
│   ├── app/
│   ├── components/
│   │   ├── ui/
│   │   ├── common/
│   │   ├── blog/
│   │   └── admin/
│   ├── composables/
│   ├── layouts/
│   ├── pages/
│   ├── stores/
│   ├── types/
│   ├── utils/
│   └── nuxt.config.ts
│
├── backend/
│   ├── app/
│   ├── alembic/
│   └── tests/
│
├── docker/
├── docs/
├── docker-compose.yml
├── README.md
└── .env.example
```

---

# 21. 开发阶段划分

## Phase 0：原项目研究

这一阶段禁止正式开发页面。

任务：

1. 克隆参考仓库；
2. 分析目录；
3. 分析首页；
4. 分析主要公开页面；
5. 分析 Design Tokens；
6. 分析动画；
7. 分析 Responsive；
8. 截取关键 Reference；
9. 明确哪些内容保留；
10. 明确哪些内容删除。

输出：

```text
docs/reference-analysis.md
```

---

# Phase 1：Architecture

建立：

- frontend；
- backend；
- MySQL；
- Docker；
- env；
- lint；
- formatter；
- API conventions。

输出：

```text
docs/architecture.md
```

此时不要投入大量时间写 UI。

---

# Phase 2：Design System

实现：

```text
GlassPanel
GlassCard
Button
Badge
Input
Modal
Dropdown
Tooltip
SectionTitle
PageContainer
Glow
Background
```

建立：

- Color Tokens；
- Typography；
- Spacing；
- Radius；
- Shadow；
- Blur；
- Animation。

创建：

`/design-system`

开发调试页。

所有基础视觉组件先在这里验证。

---

# Phase 3：首页 Prototype

只做首页。

目标：

把视觉方向做正确。

需要：

- Desktop；
- Tablet；
- Mobile。

只有首页风格通过后再继续其他页面。

不要同时开发十几个页面。

---

# Phase 4：公共页面

开发：

1. Posts；
2. Post Detail；
3. Categories；
4. Tags；
5. Search；
6. Moments；
7. Chatter；
8. Projects；
9. Friends；
10. About；
11. 404。

这一阶段可以先使用 Mock Data。

---

# Phase 5：Database + Backend

实现：

- MySQL Schema；
- SQLAlchemy Model；
- Migration；
- Repository；
- Service；
- API；
- Auth。

为核心 API 添加测试。

---

# Phase 6：Frontend API Integration

移除 Mock Data。

连接：

Nuxt
→ FastAPI
→ MySQL

完成：

- Pagination；
- Search；
- Error；
- Loading；
- Cache。

---

# Phase 7：后台

开发：

- Login；
- Dashboard；
- Post CRUD；
- Editor；
- Category；
- Tag；
- Moment；
- Chatter；
- Project；
- Friend；
- Media；
- Settings。

后台首先满足可用性。

---

# Phase 8：媒体与 Markdown

完善：

- Image Upload；
- Markdown；
- Tiptap；
- Shiki；
- KaTeX；
- TOC；
- Sanitization。

---

# Phase 9：Animation Polish

只有主要功能完成以后，再集中优化动画。

禁止一开始大量时间调动画。

检查：

- Reveal；
- Page Transition；
- Hover；
- Music Player；
- Background；
- Dialog；
- Navbar。

---

# Phase 10：Responsive + Performance

专门执行：

- Mobile testing；
- Firefox；
- Chromium；
- WebKit；
- Lighthouse；
- Animation performance；
- Bundle analysis。

必要时减少背景效果。

---

# Phase 11：Deployment

Docker Compose：

```text
nginx
frontend
backend
mysql
```

根据部署环境，也允许 Nuxt 与 FastAPI 独立部署。

生产环境：

- HTTPS；
- Reverse Proxy；
- MySQL Volume；
- Upload Volume / S3；
- Backup；
- Health Check。

---

# Phase 12：Final QA

完整测试：

- 所有导航；
- 所有链接；
- 所有页面；
- Mobile；
- CRUD；
- Upload；
- Login；
- Logout；
- Refresh；
- Search；
- Markdown；
- SEO；
- Error Page。

然后才能视为第一版完成。

---

# 22. 第一版明确不做

避免 Scope Creep：

- 照片墙；
- 灵境；
- AI Chat；
- 复杂评论系统；
- 实时在线用户；
- Elasticsearch；
- Redis；
- MQ；
- WebSocket；
- Three.js 大型场景；
- 微服务；
- 多租户；
- 复杂权限系统；
- 国际化；
- PWA。

后续根据需求增加。

---

# 23. 核心开发原则

项目开发过程中始终遵守：

1. 先分析，再实现。
2. Design System 优先于 Page。
3. 不机械翻译 React。
4. 不机械复制原仓库。
5. 视觉相似度优先于代码结构相似度。
6. 保持自己的架构。
7. 简单方案优先。
8. 可维护性优先。
9. 性能不能为特效让路。
10. Mobile 是一级平台。
11. 实际浏览器结果高于代码推测。
12. 不未经确认扩大项目范围。