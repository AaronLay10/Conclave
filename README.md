# Conclave

**Where alliances plan as one.**

Conclave is a focused web command center for planning Rise of Kingdoms events and reviewing alliance participation.

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
- Kingdom 4126 rolling predictions with confirmed-event deduplication
- Prediction review and one-click in-game confirmation workflow
- Hero Scrolls Activity and Forts CSV imports
- Formula-equivalent 100-point alliance activity scoring
- Leadership-only member rankings and reporting snapshots

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

Without Supabase values, Conclave runs in demo mode using Kingdom 4126 sample data.

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

### In-game calendar imports

Event Directors can open **Events → Calendar Import** to preview and import an
evidence-backed JSON batch. Migration `0005_calendar_import_provenance.sql`
adds stable per-kingdom import keys and screenshot provenance. Imports require
explicit UTC timestamps, enter Leadership Review, and skip existing keys unless
replacement is deliberately enabled. See `calendar-imports/README.md` for the
file format.

### Rolling event predictions

Event Directors can open **Predictions** to generate a 90-day rolling window for
repeatable Kingdom 4126 rotations. The engine currently covers Mightiest
Governor, Wheel of Fortune, Ark registration, Esmeralda's Prayer, and Hunt for
History. Generated events always enter Leadership Review as **Predicted**.

The generator compares stable prediction identities plus same-event overlapping
dates. Existing confirmed, leadership-scheduled, TBD, or already-predicted
records are never replaced. Irregular events such as More Than Gems and seasonal
events are deliberately excluded and remain manual/TBD. When an event appears
in-game, use **Confirm dates** or **Review or correct** from the prediction queue.

### Alliance activity imports

Leadership can open **Alliance Activity**, select a Hero Scrolls weekly Activity
CSV and a Forts CSV, confirm each reporting period, and preview the resulting
member scores before saving. Conclave matches records by Governor ID and
recomputes the score server-side. Migration `0006_activity_scores.sql` adds the
leadership-only snapshots and member rankings.

## Discord OAuth setup

1. Create an application named **Conclave** in the Discord Developer Portal.
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

## Event reference

Member instructions, leadership notes, source records, and reusable daily-mail summaries are maintained in [docs/event-instructions.md](docs/event-instructions.md).

## Validation

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Commit the generated lockfile after the first successful `npm install` so deployments remain reproducible.

## Current boundary

Conclave covers event operations and alliance activity reporting. Recruitment,
diplomacy, kingdom laws, war maps, and broader community-management functions
remain outside the current product boundary.
