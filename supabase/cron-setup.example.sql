-- Run after deploying the dispatch-reminders function.
-- Replace placeholders with project-specific values.
--
-- Store secrets in Supabase Vault rather than embedding them in this SQL.

select vault.create_secret('YOUR_CRON_SECRET', 'rok_events_cron_secret');

select cron.schedule(
  'dispatch-rok-event-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/dispatch-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'rok_events_cron_secret'
      )
    ),
    body := '{}'::jsonb
  );
  $$
);
