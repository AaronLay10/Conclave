# KingdomOS — RoK Events Command

A focused web command center for planning, approving, publishing, coordinating, and recording Rise of Kingdoms kingdom and alliance events.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FAaronLay10%2FKingdomOS)

## Deployment architecture

- **Vercel:** Next.js application hosting, preview deployments, and production builds
- **Supabase:** PostgreSQL, Discord authentication, Row Level Security, storage, cron, and Edge Functions
- **Discord:** announcements and scheduled reminders
- **Ubuntu Production server:** never used

## Automatic Vercel deployment

This repository is configured so Vercel can build the complete application directly from GitHub. During the Vercel install phase, `scripts/vercel-install.sh` reconstructs the application source from the temporary `source.part.*` archive, installs dependencies, and then runs the normal Next.js production build.

After the one-time Vercel import:

- Pushes to `main` create production deployments.
- Pull requests create preview deployments.
- Vercel reports deployment status back to GitHub.

## One-time Vercel setup

1. Click **Deploy with Vercel** above, or import `AaronLay10/KingdomOS` from the Vercel dashboard.
2. Keep the framework preset as **Next.js**.
3. Add these environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=
```

4. Deploy. Without Supabase values, the application opens in Kingdom 4126 demo mode.
5. After Supabase is configured, redeploy and enable Discord OAuth.

## Local development

The full editable project is also available in the generated MVP ZIP. After the source bootstrap workflow is run, the normal local commands are:

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Product scope

The MVP is intentionally events-only:

- Events dashboard and month calendar
- Kingdom and alliance events
- Confirmed, predicted, leadership-scheduled, and TBD classifications
- Event workflow and ownership
- Reusable RoK event templates
- Discord announcement generator
- In-game mail generator with 2,000-character limit
- Supabase schema, RLS policies, reminders, confirmations, and event results
