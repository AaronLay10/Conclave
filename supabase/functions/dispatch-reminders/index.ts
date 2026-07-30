import { createClient } from "npm:@supabase/supabase-js@2";

type ReminderRow = {
  id: string;
  announcement_id: string | null;
  attempt_count: number;
};

Deno.serve(async (request) => {
  const expectedSecret = Deno.env.get("CRON_SECRET");
  if (!expectedSecret || request.headers.get("x-cron-secret") !== expectedSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const discordWebhook = Deno.env.get("DISCORD_WEBHOOK_URL");

  if (!supabaseUrl || !serviceRoleKey || !discordWebhook) {
    return Response.json({ error: "Required function secrets are missing." }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: due, error } = await supabase
    .from("reminders")
    .select("id, announcement_id, attempt_count")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at")
    .limit(25);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const results = [];

  for (const reminder of (due ?? []) as ReminderRow[]) {
    const claimedAt = new Date().toISOString();

    const { data: claimed } = await supabase
      .from("reminders")
      .update({
        status: "processing",
        processing_started_at: claimedAt,
        attempt_count: reminder.attempt_count + 1
      })
      .eq("id", reminder.id)
      .eq("status", "scheduled")
      .select("id, announcement_id")
      .maybeSingle();

    if (!claimed) continue;

    try {
      if (!claimed.announcement_id) throw new Error("Reminder has no announcement.");

      const { data: announcement, error: announcementError } = await supabase
        .from("announcements")
        .select("id, title, body")
        .eq("id", claimed.announcement_id)
        .single();

      if (announcementError) throw announcementError;

      const response = await fetch(discordWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `# ${announcement.title}\n\n${announcement.body}`,
          allowed_mentions: { parse: [] }
        })
      });

      if (!response.ok) {
        throw new Error(`Discord returned ${response.status}: ${await response.text()}`);
      }

      const deliveredAt = new Date().toISOString();
      await supabase.from("reminders").update({
        status: "published",
        delivered_at: deliveredAt,
        last_error: null
      }).eq("id", reminder.id);

      await supabase.from("announcements").update({
        status: "published",
        published_at: deliveredAt,
        last_error: null
      }).eq("id", announcement.id);

      results.push({ id: reminder.id, status: "published" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown delivery error";
      await supabase.from("reminders").update({
        status: reminder.attempt_count + 1 >= 3 ? "failed" : "scheduled",
        processing_started_at: null,
        last_error: message
      }).eq("id", reminder.id);
      results.push({ id: reminder.id, status: "failed", error: message });
    }
  }

  return Response.json({ processed: results.length, results });
});
