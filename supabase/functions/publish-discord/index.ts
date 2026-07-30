import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (request) => {
  const expectedSecret = Deno.env.get("APP_FUNCTION_SECRET");
  if (!expectedSecret || request.headers.get("x-app-secret") !== expectedSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { announcementId } = await request.json();
  if (!announcementId) {
    return Response.json({ error: "announcementId is required." }, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const webhook = Deno.env.get("DISCORD_WEBHOOK_URL");

  if (!webhook) {
    return Response.json({ error: "DISCORD_WEBHOOK_URL is missing." }, { status: 500 });
  }

  const { data: announcement, error } = await supabase
    .from("announcements")
    .select("id, title, body, status")
    .eq("id", announcementId)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 404 });
  if (!["approved", "scheduled"].includes(announcement.status)) {
    return Response.json({ error: "Announcement must be approved before publication." }, { status: 409 });
  }

  const discordResponse = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: `# ${announcement.title}\n\n${announcement.body}`,
      allowed_mentions: { parse: [] }
    })
  });

  if (!discordResponse.ok) {
    const message = await discordResponse.text();
    await supabase.from("announcements").update({
      status: "failed",
      last_error: message
    }).eq("id", announcement.id);
    return Response.json({ error: message }, { status: 502 });
  }

  const publishedAt = new Date().toISOString();
  await supabase.from("announcements").update({
    status: "published",
    published_at: publishedAt,
    last_error: null
  }).eq("id", announcement.id);

  return Response.json({ ok: true, publishedAt });
});
