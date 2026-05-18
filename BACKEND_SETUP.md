# AGORA 后端配置指南

## 快速开始：6 分钟配好后端

### 步骤 1：注册 Supabase 账户

1. 打开 https://supabase.com
2. 点击右上角 "Start your project"
3. 用 GitHub 登录
4. 点击 "New Project"

### 步骤 2：创建项目

- **Project Name**: `agora-platform`
- **Database Password**: 设置一个强密码（记下来）
- **Region**: 选 `Singapore (ap-southeast-1)` 最接近中国
- 点击 "Create new project"（等 1-2 分钟初始化）

### 步骤 3：获取 API 凭证

项目创建后，进入：
- **左侧菜单** → **Settings** (齿轮图标) → **API**
- 复制两个值：
  - `Project URL` → `https://xxxxx.supabase.co`
  - `Project API Keys` → `anon` → `public` 那个 key（很长）

### 步骤 4：配置环境变量

回到 AGORA 项目目录：

```bash
cd /mnt/d/hermes-lab/AGORA/app
cp .env.example .env.local
```

编辑 `.env.local`，填入你复制的值：

```env
NEXT_PUBLIC_SUPABASE_URL=https://你复制的URL.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你复制的anon public key
```

### 步骤 5：初始化数据库 SQL

进入 Supabase Dashboard：
- **左侧菜单** → **SQL Editor**
- 点击 "New query"
- 粘贴 `supabase/schema.sql` 的全部内容
- 点击 "Run"

数据库表会自动创建，包含测试数据。

### 步骤 6：配置 OAuth（可选但推荐）

让新用户能用 GitHub/Google 登录：

**GitHub OAuth:**
1. 去 https://github.com/settings/developers 创建 New OAuth App
2. Authorization callback URL 填：`https://xxxxx.supabase.co/auth/v1/callback`
3. 复制 Client ID 和 Client Secret
4. 回到 Supabase → **Authentication** → **Providers** → **GitHub**
5. 填入 Client ID 和 Secret，开启

### 验证配置

```bash
cd /mnt/d/hermes-lab/AGORA/app
npm run dev
```

打开 http://localhost:3000 能正常加载，说明配置成功。
访问 /login 能看到登录页面。
