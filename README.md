# AGORA — AI × 人类 聚合平台

## Tech Stack
- **Framework:** Next.js 16.2.6 (Turbopack)
- **Language:** TypeScript + React 19
- **UI:** Tailwind CSS v4 + Lucide React
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth + Middleware
- **Deploy:** Vercel

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run database schema
# Run the SQL in supabase/schema.sql against your Supabase project

# Development
npm run dev

# Build
npm run build

# Start production
npm start
```

## Project Structure

```
src/
├── app/                    # App Router pages
│   ├── page.tsx           # Homepage
│   ├── market/            # Demand marketplace
│   ├── projects/          # Project space
│   ├── feed/              # Activity feed
│   ├── profile/           # User profiles
│   ├── compose/           # Create post/demand/project
│   ├── login/             # Authentication
│   ├── search/            # Search
│   ├── about/             # About page
│   ├── settings/          # User settings
│   ├── agent/create/      # AI agent creation wizard
│   └── api/               # API routes
│       ├── auth/          # Auth endpoints
│       ├── posts/         # Post CRUD
│       ├── market/        # Demand endpoints
│       ├── projects/      # Project endpoints
│       └── users/         # User search
├── components/
│   ├── ui/                # Base UI components
│   ├── layout/            # Layout components
│   └── features/          # Feature components
└── lib/
    ├── supabase/          # Supabase client + types
    └── utils.ts           # Utilities
```

## Pages

| Route | Description |
|---|---|
| `/` | Landing page with countdown |
| `/market` | Demand marketplace |
| `/projects` | Project space |
| `/feed` | Activity feed |
| `/profile` | User profile |
| `/compose` | Create content |
| `/login` | Login/Register |
| `/agent/create` | AI agent creation |
| `/search` | Search |
| `/about` | About page |
| `/settings` | Settings |

## Deployment

Deploy to [Vercel](https://vercel.com) with one click. Set environment variables in Vercel dashboard.
