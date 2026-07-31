import { createClient, type User } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-app-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

function cleanWebhookUrl(value: string) {
  const url = new URL(value);
  if (!url.hostname.endsWith("discord.com") || !url.pathname.includes("/api/webhooks/")) {
    throw new Error("DISCORD_WEBHOOK_URL is not a valid Discord webhook URL.");
  }
  url.search = "";
  return url;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Supabase function environment is incomplete." }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const expectedSecret = Deno.env.get("APP_FUNCTION_SECRET");
  const suppliedSecret = request.headers.get("x-app-secret");
  const isSystemCaller = Boolean(
    expectedSecret && suppliedSecret && suppliedSecret === expectedSecret
  );

  let user: User | null = null;

  if (!isSystemCaller) {
    const authorization = request.headers.get("Authorization");
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : null;

    if (!token) {
      return json({ error: "Authentication required." }, 401);
    }

    const {
      data: { user: authenticatedUser },
      error: authError
    } = await admin.auth.getUser(token);

    if (authError || !authenticatedUser) {
      return json({ error: "The Conclave session is invalid or expired." }, 401);
    }

    user = authenticatedUser;
  }

  async function isEventDirector(kingdomId?: string) {
    if (isSystemCaller) return true;
    if (!user) return false;

    let query = admin
      .from("memberships")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "event_director")
      .eq("is_active", true)
      .limit(1);

    if (kingdomId) query = query.eq("kingdom_id", kingdomId);

    const { data, error } = await query.maybeSingle();
    return !error && Boolean(data);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "A JSON request body is required." }, 400);
  }

  const action =
    typeof payload.action === "string"
      ? payload.action
      : payload.announcementId
        ? "publish"
        : "status";

  const webhookSecret = Deno.env.get("DISCORD_WEBHOOK_URL");

  if (action === "status") {
    if (!(await isEventDirector())) {
      return json({ error: "Event Director access is required." }, 403);
    }

    if (!webhookSecret) {
      return json({
        configured: false,
        connected: false,
        detail: "DISCORD_WEBHOOK_URL has not been added to Supabase Edge Function secrets."
      });
    }

    try {
      const webhookUrl = cleanWebhookUrl(webhookSecret);
      const response = await fetch(webhookUrl);
      const webhook = response.ok ? await response.json() : null;

      return json({
        configured: true,
        connected: response.ok,
        webhookName: webhook?.name ?? null,
        channelId: webhook?.channel_id ?? null,
        guildId: webhook?.guild_id ?? null,
        detail: response.ok
          ? "Discord accepted the configured webhook."
          : `Discord returned HTTP ${response.status}.`
      });
    } catch (error) {
      return json({
        configured: true,
        connected: false,
        detail: error instanceof Error ? error.message : "Unable to inspect the Discord webhook."
      });
    }
  }

  if (action === "test") {
    if (!(await isEventDirector())) {
      return json({ error: "Event Director access is required." }, 403);
    }

    if (!webhookSecret) {
      return json({ error: "DISCORD_WEBHOOK_URL is missing." }, 503);
    }

    try {
      const webhookUrl = cleanWebhookUrl(webhookSecret);
      webhookUrl.searchParams.set("wait", "true");

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "Conclave",
          embeds: [
            {
              title: "Conclave connection confirmed",
              description:
                "Kingdom 4126 event leadership can now publish event announcements to this channel.",
              color: 12094010,
              footer: { text: "Conclave • Where alliances plan as one" },
              timestamp: new Date().toISOString()
            }
          ],
          allowed_mentions: { parse: [] }
        })
      });

      if (!response.ok) {
        return json({ error: await response.text() }, 502);
      }

      const message = await response.json();
      return json({ ok: true, messageId: message.id ?? null });
    } catch (error) {
      return json(
        { error: error instanceof Error ? error.message : "Discord test failed." },
        502
      );
    }
  }

  if (action !== "publish") {
    return json({ error: "Unknown Discord action." }, 400);
  }

  const announcementId =
    typeof payload.announcementId === "string" ? payload.announcementId : null;

  if (!announcementId) {
    return json({ error: "announcementId is required." }, 400);
  }

  if (!webhookSecret) {
    return json({ error: "DISCORD_WEBHOOK_URL is missing." }, 503);
  }

  const { data: announcement, error: announcementError } = await admin
    .from("announcements")
    .select("id, title, body, status, event_id, events!inner(kingdom_id, name)")
    .eq("id", announcementId)
    .single();

  if (announcementError || !announcement) {
    return json({ error: announcementError?.message ?? "Announcement not found." }, 404);
  }

  const relatedEvent = Array.isArray(announcement.events)
    ? announcement.events[0]
    : announcement.events;
  const kingdomId = relatedEvent?.kingdom_id as string | undefined;

  if (!kingdomId || !(await isEventDirector(kingdomId))) {
    return json({ error: "Event Director access is required for this kingdom." }, 403);
  }

  if (!["approved", "scheduled"].includes(announcement.status)) {
    return json({ error: "Announcement must be approved before publication." }, 409);
  }

  if (announcement.title.length > 256 || announcement.body.length > 4096) {
    return json({ error: "Discord title or message exceeds the embed limit." }, 400);
  }

  try {
    const webhookUrl = cleanWebhookUrl(webhookSecret);
    webhookUrl.searchParams.set("wait", "true");

    const discordResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Conclave",
        embeds: [
          {
            title: announcement.title,
            description: announcement.body,
            color: 12094010,
            footer: { text: "Conclave • Kingdom 4126 Events" },
            timestamp: new Date().toISOString()
          }
        ],
        allowed_mentions: { parse: [] }
      })
    });

    if (!discordResponse.ok) {
      const message = await discordResponse.text();
      await admin
        .from("announcements")
        .update({ status: "failed", last_error: message })
        .eq("id", announcement.id);
      return json({ error: message }, 502);
    }

    const discordMessage = await discordResponse.json();
    const publishedAt = new Date().toISOString();

    await admin
      .from("announcements")
      .update({
        status: "published",
        published_at: publishedAt,
        external_message_id: discordMessage.id ?? null,
        last_error: null
      })
      .eq("id", announcement.id);

    return json({
      ok: true,
      publishedAt,
      messageId: discordMessage.id ?? null
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discord publication failed.";
    await admin
      .from("announcements")
      .update({ status: "failed", last_error: message })
      .eq("id", announcement.id);
    return json({ error: message }, 502);
  }
});
