# Production Deployment Checklist

## Supabase

- [ ] Project created in a region appropriate for the user base
- [ ] Database migrations applied
- [ ] Discord provider enabled
- [ ] Site URL and redirect URLs configured
- [ ] First Event Director membership bootstrapped
- [ ] RLS policies tested with director, council, alliance lead, and viewer accounts
- [ ] Discord webhook configured as an Edge Function secret
- [ ] `dispatch-reminders` deployed
- [ ] `publish-discord` deployed
- [ ] Cron Vault secret created
- [ ] Cron dispatcher scheduled
- [ ] Function logs checked with a test announcement

## Vercel

- [ ] GitHub repository imported
- [ ] Supabase public environment variables added
- [ ] Production domain assigned
- [ ] Preview deployments enabled
- [ ] `/api/health` returns `ok: true`
- [ ] Production OAuth callback added to Discord and Supabase
- [ ] Build, typecheck, and lint pass

## Operational acceptance

- [ ] Event Director can create a kingdom event
- [ ] Alliance lead can create only an event for their alliance
- [ ] Viewer cannot access a draft kingdom event
- [ ] Published event appears on the calendar
- [ ] Discord timestamp converts correctly
- [ ] In-game mail stays below 2,000 characters
- [ ] Reminder is delivered exactly once
- [ ] Failed reminder records its error
- [ ] No component uses the Ubuntu Production server
