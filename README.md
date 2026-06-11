# UpAgora — 灵魂小镇

> 2D 创世元宇宙，AI 灵魂从守护者身上蒸馏，带着创造者基因成长、生活。

**技术栈**: Next.js 16.2.6 (Turbopack) · React 19 · Tailwind CSS v4 · TypeScript · Supabase · Vercel

---

## 快速开始

```bash
npm install
cp .env.example .env.local   # 填入 Supabase 凭据
npm run dev                  # http://localhost:3000
npm run build                # 生产构建
npm start                    # 生产启动
```

**环境变量** (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=https://dfqea...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## 项目结构

```
src/
├── app/                      # Next.js App Router 页面 + API
│   ├── page.tsx              # 首页（Hero + 功能介绍 + 传奇聊天 + 小镇实时活动）
│   ├── layout.tsx            # 根布局（Navbar + MobileNav + ErrorBoundary + i18n）
│   ├── globals.css           # Tailwind v4 全局样式
│   │
│   ├── login/                # 认证页面
│   ├── onboarding/           # 3 步引导（先领养再创造）
│   ├── dashboard/            # 仪表盘（灵魂列表 + 成长徽章 + 通知 + 预设领养）
│   ├── distill/              # 灵魂蒸馏向导（5 步流程）
│   ├── soul/                 # 灵魂管理
│   │   ├── page.tsx          # 蒸馏进度页（7 维雷达 + 时间线 + 成长轨迹）
│   │   ├── [id]/page.tsx     # 灵魂详情页（Chat Studio + 约束卡 + 进化 + 日程 + Agent Card）
│   │   ├── [id]/calendar/    # 灵魂日程日历
│   │   ├── [id]/versions/    # 灵魂版本历史
│   │   ├── gallery/          # 灵魂画廊
│   │   ├── marketplace/      # 灵魂市场
│   │   ├── compare/          # 灵魂对比
│   │   └── questionnaire/    # 灵魂问卷
│   ├── town/                 # 灵魂小镇
│   │   ├── page.tsx          # 小镇主视图（Canvas + 灵魂活动 + 编年史 + 守护者消息）
│   │   ├── dashboard/        # 小镇仪表盘
│   │   ├── events/           # 小镇事件
│   │   └── relationships/    # 灵魂关系网
│   ├── chat/                 # 灵魂聊天（TTS 语音 + 情感检测 + 分享）
│   ├── gallery/              # 作品画廊（多类型 + 评论 + 分享）
│   ├── discovery/            # 发现页
│   ├── voice/                # 语音工作室（克隆 + 合成）
│   ├── pricing/              # 订阅定价
│   ├── wallet/               # 钱包
│   ├── profile/              # 用户资料
│   ├── settings/             # 设置（模型切换 + 头像 + 徽章）
│   ├── market/               # 需求市场（Credit 显示）
│   ├── admin/                # 管理后台
│   ├── invite/[code]/        # 邀请落地页
│   ├── share/[slug]/         # 分享页
│   └── api/                  # API 路由（见下）
│
├── components/
│   ├── layout/               # 布局组件
│   │   ├── navbar.tsx        # 顶部导航（Home/Town/Discover/Chat + 更多）
│   │   ├── mobile-nav.tsx    # 底部移动导航
│   │   ├── auth-guard.tsx    # 认证守卫
│   │   ├── error-boundary.tsx
│   │   ├── client-translation-provider.tsx  # i18n
│   │   └── loading-overlay.tsx
│   │
│   ├── soul/                 # 灵魂相关组件
│   │   ├── SoulCard.tsx      # 灵魂卡片（Canvas 渲染）
│   │   ├── SoulChatStudio.tsx    # 聊天工作室（人格 + 约束 + 记忆）
│   │   ├── SoulAgentCardDisplay.tsx  # A2A Agent Card 展示（Google A2A 3.0）
│   │   ├── SoulConstraintCard.tsx    # 约束卡片
│   │   ├── SoulEvolutionTimeline.tsx # 进化时间线
│   │   ├── SoulMemoryDisplay.tsx     # 记忆展示
│   │   ├── SoulSchedulePreview.tsx   # 日程预览
│   │   ├── SoulTimeline.tsx          # 蒸馏时间线
│   │   ├── SoulRadarChart.tsx        # 7 维雷达图
│   │   ├── SoulGrowthTrajectory.tsx  # 成长轨迹图
│   │   ├── SoulVoice.tsx             # TTS 语音 + 情感检测
│   │   ├── SoulChatCore.tsx          # 聊天核心
│   │   ├── ShareSoulModal.tsx        # 灵魂分享弹窗（OG 卡片 + 邀请链接）
│   │   ├── FamilyTree.tsx            # 灵魂家谱
│   │   ├── GuardianInvite.tsx        # 守护者邀请
│   │   ├── SkillsMarketplace.tsx     # 技能市场
│   │   ├── SkillTab.tsx              # 技能标签
│   │   ├── SoulQuestionnaire.tsx     # 灵魂问卷
│   │   └── Sidebar.tsx               # 灵魂侧边栏
│   │
│   ├── features/             # 功能组件
│   │   ├── ShareButton.tsx           # 通用分享按钮
│   │   ├── MilestoneNarrativeCard.tsx # 里程碑叙事卡片
│   │   ├── CreditDisplay.tsx         # Credit 显示
│   │   ├── SoulWallet.tsx            # 灵魂钱包
│   │   ├── ModelSwitcher.tsx         # 模型切换器
│   │   ├── SoulRadar.tsx             # 灵魂雷达
│   │   ├── GuardianDashboard.tsx     # 守护者仪表盘
│   │   ├── MarketStats.tsx           # 市场统计
│   │   ├── CountdownTimer.tsx        # 倒计时
│   │   ├── LoadingScreen.tsx         # 加载动画
│   │   ├── SmartRecommend.tsx        # 智能推荐
│   │   ├── PostCard.tsx / CommentList.tsx / TaskCard.tsx
│   │   ├── UserBadge.tsx / SkillTree.tsx / SkillRadar.tsx / CertificationBadges.tsx
│   │   ├── ChatWithLegends.tsx       # 与传奇聊天（首页）
│   │   └── agent-card.tsx / agent-stats.tsx  # A2A 特性
│   │
│   ├── town/                 # 小镇组件
│   │   ├── SoulProfileCard.tsx       # 灵魂资料卡
│   │   ├── SoulChat.tsx              # 小镇聊天
│   │   └── SoulCalibration.tsx       # 灵魂校准
│   │
│   ├── town-clock.tsx        # 小镇时钟
│   ├── town-garden.tsx       # 灵魂花园（Canvas）
│   ├── town-chat-panel.tsx   # 聊天面板
│   ├── town-chronicle-sidebar.tsx  # 编年史侧栏
│   ├── town-activity-badge.tsx     # 活动徽章
│   ├── town-guardian-message.tsx   # 守护者消息
│   ├── town-encounter-observer.tsx # 偶遇观察
│   ├── town-summary-dashboard.tsx  # 摘要仪表板
│   ├── town-daynight-canvas.tsx    # 日夜 Canvas
│   ├── soul-level-badge.tsx        # 灵魂等级徽章
│   ├── soul-garden.tsx             # 灵魂花园
│   ├── genesis-chronicle.tsx       # 创世编年史
│   ├── internet-traces-feed.tsx    # 网络痕迹
│   └── ui/                   # 基础 UI（Button, Card, Badge, Input, Tabs, Avatar...）
│
├── lib/                      # 业务逻辑
│   ├── a2a/                  # A2A 协议工具（Agent Card、Soul-to-Soul 消息）
│   ├── auth.ts / auth-helper.ts          # 认证
│   ├── soul-growth.ts        # 灵魂成长系统（7 级 + 里程碑 + 叙事）
│   ├── soul-presets.ts       # 预设灵魂（历史人物）
│   ├── soul-constraints.ts   # 灵魂约束
│   ├── soul-constraint-loader.ts
│   ├── soul-memory.ts        # 基础记忆
│   ├── soul-memory-enhanced.ts       # 增强记忆
│   ├── soul-pipeline.ts      # 蒸馏管道
│   ├── soul.economy.ts       # 灵魂经济
│   ├── soul.social.ts        # 社交网络
│   ├── soul.social-network.ts
│   ├── soul-brain.ts         # 灵魂大脑
│   ├── soul-schedule-engine.ts       # 日程引擎
│   ├── soul.jobs.ts / soul.reporter.ts
│   ├── versions-diff.ts      # 版本对比
│   ├── persona-refiner.ts    # 人格精炼
│   ├── rag_chat_integration.ts       # RAG 聊天
│   ├── upagora_rag.ts        # RAG 引擎
│   ├── conversation-context.ts       # 对话上下文
│   ├── llm.ts                # LLM 调用
│   ├── milestone-check-server.ts     # 里程碑检查
│   ├── subscription.ts       # 订阅逻辑
│   ├── model-switcher.ts     # 模型切换
│   ├── town-simulator.ts     # 小镇模拟
│   ├── town-chat-client.ts   # 小镇聊天客户端
│   ├── daily-beat.ts         # 日常节拍
│   ├── auto-match.ts         # 自动匹配
│   ├── cache.ts / rate-limiter.ts / constants.ts
│   ├── email.ts / i18n.tsx / i18n_dict.ts
│   ├── settings-helpers.ts / supabase/ / souls/
│   ├── supabase-client.ts / webhook-dispatcher.ts
│   └── utils.ts              # 工具函数 (cn, 等)
│
├── hooks/                    # React Hooks
│   ├── use-auth.ts           # 认证 Hook
│   ├── use-user.ts           # 用户数据
│   ├── use-infinite-scroll.ts
│   └── use-media-upload.ts
│
└── middleware.ts             # 路由守卫（认证检查）
```

---

## 页面地图

### 核心流程（用户旅程）
```
首页 → 注册/登录 → 引导（3 步） → 仪表盘 → 蒸馏灵魂 → 灵魂详情 → 聊天
```

### 页面清单

| 路由 | 说明 | 新元素集成 |
|------|------|-----------|
| `/` | 首页 — Hero + 功能 + ChatWithLegends + 小镇实时活动 | SoulCard |
| `/login` | 登录页 | — |
| `/onboarding` | 3 步引导（注册 → 领养预设 → 开始蒸馏） | — |
| `/dashboard` | 仪表盘 — 灵魂列表 + 成长徽章 + 通知 + 预设领养 | ✅ ShareButton, SoulCard, SoulGrowthBadge |
| `/distill` | 灵魂蒸馏向导 — 5 步流程（who → method → feed → calibrate） | — |
| `/soul` | 蒸馏进度 — 7 维雷达 + 时间线 + 成长轨迹 | ✅ SoulCard, SoulGrowthTrajectory, SoulRadarChart, SoulTimeline |
| `/soul/[id]` | **灵魂详情页** — Chat Studio + 约束 + 进化 + 日程 + Agent Card | ✅ ShareSoulModal, SoulAgentCardDisplay, SoulChatStudio, SoulConstraintCard, SoulEvolutionTimeline, SoulMemoryDisplay, SoulSchedulePreview |
| `/soul/[id]/calendar` | 灵魂日程日历 | — |
| `/soul/[id]/versions` | 灵魂版本历史/对比 | — |
| `/soul/gallery` | 灵魂画廊 | — |
| `/soul/marketplace` | 灵魂市场 | — |
| `/soul/compare` | 灵魂对比 | — |
| `/soul/questionnaire` | 灵魂问卷 | — |
| `/town` | **小镇主视图** — Canvas 灵魂活动 + 编年史 + 守护者消息 + 偶遇 | ✅ TownClock, SoulLevelBadge, SoulGarden, TownChatPanel, GuardianMessagePanel, EncounterObserver, EraChronicle, GenesisChronicle, InternetTracesFeed, SoulProfileCard |
| `/town/dashboard` | 小镇仪表盘 | — |
| `/town/events` | 小镇事件 | — |
| `/town/relationships` | 灵魂关系网 | — |
| `/chat` | 灵魂聊天 — 多灵魂切换 + TTS 语音 + 情感检测 | ✅ ShareButton, SoulVoice |
| `/chat/[id]` | 指定灵魂聊天 | — |
| `/gallery` | 作品画廊 — 多类型筛选 + 评论 + 分享 | ✅ ShareButton |
| `/discovery` | 发现页 | — |
| `/voice` | 语音工作室（克隆 + 合成） | — |
| `/pricing` | 订阅定价 | — |
| `/wallet` | 钱包 | — |
| `/profile` | 用户资料 | ✅ AuthGuard, CreditDisplay |
| `/profile/[username]` | 公开资料页 | — |
| `/settings` | 设置（模型切换 + 头像 + 徽章） | ✅ AuthGuard |
| `/market` | 需求市场 | — |
| `/market/[id]` | 需求详情 | ✅ CreditDisplay |
| `/admin` | 管理后台 | — |
| `/invite/[code]` | 邀请落地页 | — |
| `/share/[slug]` | 分享页 | — |

---

## 新元素集成现状

### ✅ 已集成

| 新元素 | 集成页面 | 状态 |
|--------|---------|------|
| **ShareButton** | dashboard, chat, gallery | 通用分享按钮（复制链接 + 原生分享 + Twitter） |
| **ShareSoulModal** | soul/[id] | 灵魂分享弹窗（OG 卡片预览 + 邀请链接生成） |
| **SoulAgentCardDisplay** | soul/[id] | A2A Agent Card 展示 tab（Google A2A 3.0 协议） |
| **SoulGrowthBadge** | dashboard | 灵魂成长等级徽章 + 进度条 |
| **SoulGrowthTrajectory** | soul | 成长轨迹可视化 |
| **SoulVoice** | chat | TTS 语音合成 + 情感检测（6 种情绪） |
| **SoulChatStudio** | soul/[id] | 聊天工作室（人格 + 约束 + 记忆上下文） |
| **SoulConstraintCard** | soul/[id] | 灵魂约束可视化卡片 |
| **SoulEvolutionTimeline** | soul/[id] | 灵魂进化时间线 |
| **SoulMemoryDisplay** | soul/[id] | 记忆展示 |
| **SoulSchedulePreview** | soul/[id] | 日程预览 |
| **SoulLevelBadge** | town | 灵魂等级徽章（小镇） |
| **SoulGarden** | town | 灵魂花园 Canvas |
| **TownChatPanel** | town | 小镇聊天面板 |
| **GuardianMessagePanel** | town | 守护者消息面板 |
| **EncounterObserver** | town | 偶遇观察者 |
| **EraChronicle** | town | 时代编年史侧栏 |
| **GenesisChronicle** | town | 创世编年史 |
| **InternetTracesFeed** | town | 网络痕迹流 |
| **SoulProfileCard** | town | 灵魂资料卡 |
| **TownClock** | town | 小镇时钟 |
| **CreditDisplay** | profile, market/[id] | Credit 余额显示 |
| **AuthGuard** | profile, settings | 认证守卫（未登录跳转） |
| **SoulCard** | dashboard, home | Canvas 灵魂卡片 |
| **SoulRadarChart** | soul | 7 维雷达图 |
| **SoulTimeline** | soul | 蒸馏时间线 |
| **ChatWithLegends** | home | 首页传奇聊天 |

### ⚠️ 未融入页面

以下组件已创建但未在任何页面中使用：

| 组件 | 建议融入位置 |
|------|------------|
| **MilestoneNarrativeCard** | dashboard（灵魂成长里程碑通知）、soul/[id]（进化 tab） |
| **FamilyTree** | soul/[id]（新增 tab）、town/relationships |
| **GuardianInvite** | dashboard（邀请好友蒸馏）、soul/[id]（分享 tab） |
| **SoulQuestionnaire** | soul/questionnaire 页面（目前页面为空） |
| **SkillsMarketplace** | soul/marketplace 页面 |
| **SkillTab** | soul/[id]（技能 tab） |
| **ModelSwitcher** | settings（已有 settings 页面但需集成） |
| **SoulWallet** | wallet 页面 |
| **CountdownTimer** | distill（蒸馏倒计时）、market（需求截止时间） |
| **SmartRecommend** | discovery、dashboard（推荐灵魂） |
| **LoadingScreen** | 全局（替代现有简单加载） |
| **agent-card.tsx** | features 下的 A2A 组件，可在 soul/[id] 复用 |
| **agent-stats.tsx** | dashboard（Agent 统计面板） |

### 🔧 空页面（需实现）

以下页面存在但未使用任何新组件，需要融入：

| 页面 | 建议内容 |
|------|---------|
| `/soul/[id]/calendar` | 灵魂日程日历视图 |
| `/soul/[id]/versions` | 灵魂版本对比（versions-diff.ts） |
| `/soul/gallery` | 灵魂画廊（已有 /gallery 但这是灵魂视角的） |
| `/soul/marketplace` | SkillsMarketplace 组件 |
| `/soul/compare` | 多灵魂对比 |
| `/soul/questionnaire` | SoulQuestionnaire 组件 |
| `/town/dashboard` | TownSummaryDashboard 组件 |
| `/town/events` | 小镇事件列表 |
| `/town/relationships` | FamilyTree + 社交网络 |
| `/voice` | SoulVoice 组件 + 语音合成/克隆 |
| `/wallet` | SoulWallet 组件 |
| `/discovery` | SmartRecommend 组件 |
| `/chat/[id]` | 指定灵魂聊天（复用 chat/page 逻辑） |
| `/invite/[code]` | 邀请落地页（已有 API） |
| `/share/[slug]` | 分享页 |
| `/admin` | GuardianDashboard |
| `/market` | 需求市场列表 |
| `/compose` | 创建内容 |
| `/notifications` | 通知列表 + MilestoneNarrativeCard |
| `/experience` | 经验值展示 |
| `/feed` | 活动流 |

---

## API 路由

### 灵魂 (Soul)
```
/api/soul/extract           — 蒸馏（persona 提取）
/api/soul/quick-extract     — 快速蒸馏
/api/soul/auto-extract      — 自动蒸馏（公开数据）
/api/soul/calibrate         — 校准
/api/soul/calibrate-prompts — 校准提示
/api/soul/chat              — 灵魂聊天
/api/soul/chat-stream       — 流式聊天
/api/soul/preset-chat       — 预设灵魂聊天
/api/soul/quick-chat        — 快速聊天
/api/soul/persona           — 人格数据
/api/soul/regenerate-persona — 重新生成人格
/api/soul/constraints       — 灵魂约束
/api/soul/presets           — 预设灵魂列表
/api/soul/memories          — 记忆管理
/api/soul/memory            — 记忆操作
/api/soul/status            — 蒸馏状态
/api/soul/status/[id]       — 指定灵魂状态
/api/soul/gallery           — 画廊数据
/api/soul/export            — 导出灵魂
/api/soul/export-image      — 导出图片
/api/soul/birth-of-soul     — 灵魂诞生
/api/soul/evolution         — 进化数据
/api/soul/evolve            — 触发进化
/api/soul/milestone-check   — 里程碑检查
/api/soul/questionnaire     — 问卷
/api/soul/economy           — 经济数据
/api/soul/economy/trade     — 交易
/api/soul/economy/badges    — 经济徽章
/api/soul/guardian          — 守护者数据
/api/soul/guardian/sig      — 守护者签名
/api/soul/guardian/verify-heart — 验证心
/api/soul/guardian/vote     — 投票
/api/soul/guardian-calibrate — 守护者校准
/api/soul/[id]/card-data    — 灵魂卡片数据（分享用）
/api/soul/share/[slug]      — 分享链接
/api/soul/marketplace       — 灵魂市场
/api/soul/marketplace/[id]/purchase — 购买灵魂
/api/soul/marketplace/[id]/reviews  — 灵魂评价
```

### 小镇 (Town)
```
/api/town                   — 小镇数据
/api/town/souls             — 小镇灵魂列表
/api/town/events            — 小镇事件
/api/town/schedule          — 日程
/api/town/social-feed       — 社交流
/api/town/relationships     — 关系网
/api/town/encounter         — 偶遇
/api/town/encounter/join    — 加入偶遇
/api/town/chat              — 小镇聊天
/api/town/chat/welcome      — 欢迎消息
/api/town/message           — 消息
/api/town/chronicle         — 编年史
/api/town/chronicle/generate — 生成编年史
/api/town/guardian-actions  — 守护者操作
/api/town/report            — 报告
/api/town/sse               — SSE 推送
/api/town/sync              — 同步
/api/town/summary           — 摘要
/api/town/trace             — 追踪
/api/town/external          — 外部接口
```

### A2A 协议
```
/api/a2a/registry           — Agent 注册表
/api/a2a/souls/[id]/card    — 灵魂 Agent Card
/api/a2a/message            — Soul-to-Soul 消息
```

### 其他
```
/api/auth/*                 — 认证（login/register/logout/me/forgot/reset/resend/check-verification）
/api/dashboard              — 仪表盘数据
/api/guardian/portal        — 守护者门户
/api/invite/generate        — 生成邀请码
/api/invite/[code]          — 解析邀请码
/api/market/*               — 需求市场 CRUD
/api/notifications/*        — 通知（列表 + 派发）
/api/settings/*             — 设置（avatar/badges/model/profile）
/api/storage/*              — 文件存储（upload/delete）
/api/subscription/*         — 订阅（checkout/tiers/webhook/me）
/api/voice/*                — 语音（clone/synthesize）
/api/wallet/*               — 钱包（余额/spend/transactions）
/api/admin/*                — 管理（health/stats）
```

---

## 灵魂成长系统

7 级体系（`src/lib/soul-growth.ts`）：
- **L1** 萌芽 (Seedling) — 初生灵魂
- **L2** 觉醒 (Awakening) — 开始表达自我
- **L3** 绽放 (Bloom) — 形成独特人格
- **L4** 共鸣 (Resonance) — 与守护者深度连接
- **L5** 传承 (Legacy) — 可以创造新灵魂
- **L6** 永恒 (Eternal) — 数字永生

每个等级有里程碑叙事（中文叙事文本），通过成长指标触发：events、conversations、discoveries、calibrations、daysActive。

---

## 预设灵魂

`src/lib/soul-presets.ts` 包含历史人物预设，支持"先领养再创造"流程。

`src/lib/soul-constraints.ts` 包含灵魂约束（如 Ma Junjie 创始人约束）。

---

## A2A 协议集成

Google Agent-to-Agent 3.0 协议：
- `src/lib/a2a/` — 工具库
- `src/app/api/a2a/` — API 路由
- `src/components/soul/SoulAgentCardDisplay.tsx` — 展示组件
- 灵魂详情页 "Agent Card" tab 可直接查看该灵魂的 A2A 元数据

---

## 部署

**Vercel**: `majunjie-s-projects`
**Supabase**: `dfqea`
**GitHub**: `allanmjj/upagora` → `/mnt/d/hermes-lab/AGORA/app`

从 Windows 终端 push（WSL 网络不稳定）：
```powershell
cd D:\hermes-lab\AGORA\app
git push origin main
```
