# AI Studio — Twitter Clone

A portfolio-grade social network inspired by the interaction model and responsive layout of X/Twitter. The application is built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Features

- Responsive three-column desktop layout and mobile bottom navigation
- Secure email/password authentication with Supabase Auth and SSR cookies
- Public home timeline with 280-character posts
- Image uploads through Supabase Storage
- Post detail pages and threaded replies
- Optimistic likes, reposts, bookmarks, and follows
- Public profiles with avatar, banner, bio, location, and website editing
- Followers and following lists
- Explore search across people and posts
- Private bookmarks and account notifications
- Database-generated notifications for likes, reposts, replies, and follows
- Dark X/Twitter-inspired UI with the custom AI Studio identity

## Stack

- Next.js 16 App Router
- React 19 and TypeScript
- Tailwind CSS 4
- Supabase Auth, Postgres, Storage, and Row Level Security
- Cloudflare Workers with the OpenNext adapter
- ESLint and npm security auditing

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and add the project values from the Supabase Connect dialog:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
   ```

3. Apply the SQL files in `supabase/migrations` to a Supabase project.

4. Start the application:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

## Cloudflare deployment

The repository includes the production configuration for Cloudflare Workers:

```bash
npm run build:cloudflare
npm run preview
npm run deploy
```

For Cloudflare Workers Builds, use `npm run build:cloudflare` as the build command and `npx wrangler deploy --keep-vars` as the deploy command. Configure both Supabase values as build secrets and runtime secrets:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

## Quality checks

```bash
npm run lint
npm run build
npm audit
```

## Security

All exposed tables have Row Level Security enabled. Public timelines can only read public social data. Creating or modifying posts, likes, reposts, follows, bookmarks, notifications, and media requires an authenticated user, with ownership verified in the database policies. The browser receives only the Supabase publishable key; no service-role key is used by the application.

## Main routes

- `/` — home timeline
- `/explore` — people and post search
- `/notifications` — account activity
- `/bookmarks` — private saved posts
- `/messages` — inbox entry page
- `/post/[id]` — post detail and replies
- `/[username]` — public profile
- `/login` and `/register` — authentication
