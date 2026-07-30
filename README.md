# RoK Events Command

A focused web command center for planning, approving, publishing, coordinating, and recording Rise of Kingdoms kingdom and alliance events.

## Delivered MVP

- Command dashboard
- Month calendar
- Kingdom and alliance event list
- Event creation
- Event detail and leadership checklist
- Confirmed / predicted / leadership-scheduled / TBD classification
- Workflow states from draft through completed
- Reusable RoK event templates
- Discord announcement generator with local-time timestamps
- In-game mail generator with a 2,000-character counter
- Discord OAuth through Supabase
- PostgreSQL schema with Row Level Security
- Alliance and kingdom role model
- Reminder and announcement tables
- Supabase Edge Function for Discord delivery
- Supabase Cron example
- Demo mode before cloud services are connected

## Architecture

```text
Vercel
└── Next.js App Router application

Supabase
├── PostgreSQL
├── Auth with Discord
├── Row Level Security
├── Storage-ready permissions
├── Cron
└── Edge Functions

Discord
└── Webhooks for announcements and reminders
```

The application never uses or targets the user's Ubuntu Production server.

## Local startup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000/dashboard`.

Without Supabase values, the application runs in demo mode using Kingdom 4126 sample data.

## Supabase setup

1. Create a hosted Supabase project.
2. Install the Supabase CLI:
   ```bash
   npm install --global supabase
   ```
3. Link the local project:
   ```bash
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   ```
4. Apply migrations. This creates Kingdom 4126, Valkania Syndicate [126V], the event tables, templates, and RLS policies:
   ```bash
   supabase db push
   ```
5. Add the public project values to `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```
6. Restart the Next.js dev server.

## Discord OAuth setup

1. Create an application in the Discord Developer Portal.
2. In Discord OAuth2, add the callback URL shown by the Supabase Discord provider page.
3. Enable Discord under **Supabase → Authentication → Providers**.
4. Enter the Discord client ID and client secret.
5. Add these redirect URLs under **Supabase → Authentication → URL Configuration**:
   - `http://localhost:3000/auth/callback`
   - `https://YOUR_VERCEL_DOMAIN/auth/callback`

## Bootstrap the first Event Director

After the first Discord login, the profile is created automatically. Run this once in the Supabase SQL editor, replacing the email:

```sql
with target_kingdom as (
  select id from public.kingdoms where kingdom_number = 4126
),
target_alliance as (
  select a.id
  from public.alliances a
  join target_kingdom k on k.id = a.kingdom_id
  where a.tag = '126V'
),
target_user as (
  select id from public.profiles where email = 'YOUR_DISCORD_EMAIL'
)
insert into public.memberships (user_id, kingdom_id, alliance_id, role)
select u.id, k.id, a.id, 'event_director'
from target_user u
cross join target_kingdom k
cross join target_alliance a;
```

## Deploy Edge Functions

```bash
supabase functions deploy dispatch-reminders --no-verify-jwt
supabase functions deploy publish-discord --no-verify-jwt
```

Set function secrets:

```bash
supabase secrets set \
  DISCORD_WEBHOOK_URL="YOUR_DISCORD_WEBHOOK" \
  CRON_SECRET="A_LONG_RANDOM_SECRET" \
  APP_FUNCTION_SECRET="A_DIFFERENT_LONG_RANDOM_SECRET"
```

Use `supabase/cron-setup.example.sql` to schedule the dispatcher after replacing the project reference and creating the Vault secret.

## Deploy to Vercel

1. Push the folder to a GitHub repository.
2. Import the repository into Vercel.
3. Add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_APP_URL`
4. Deploy.
5. Add the production callback URL in Supabase Auth and Discord OAuth.
6. Do not add Supabase service-role credentials to client-visible environment variables.

## Validation

```bash
npm run typecheck
npm run lint
npm run build
```

Commit the generated lockfile after the first successful `npm install` so deployments remain reproducible.

## MVP boundary

This repository intentionally excludes recruitment, diplomacy, member statistics, kingdom laws, war maps, and broader AllianceOS functions. It is an events-only product that can later become an AllianceOS module without a rewrite.
