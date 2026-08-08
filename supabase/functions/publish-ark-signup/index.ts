import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

function safeBaseUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.hostname !== "localhost") throw new Error("A secure Conclave URL is required.");
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const webhookSecret = Deno.env.get("DISCORD_WEBHOOK_URL");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Supabase function environment is incomplete." }, 500);
  if (!webhookSecret) return json({ error: "DISCORD_WEBHOOK_URL is missing." }, 503);

  const authorization = request.headers.get("Authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!token) return json({ error: "Authentication required." }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return json({ error: "The Conclave session is invalid or expired." }, 401);

  let payload: { cycleId?: string; baseUrl?: string };
  try {
    payload = await request.json();
  } catch {
    return json({ error: "A JSON request body is required." }, 400);
  }
  if (!payload.cycleId || !payload.baseUrl) return json({ error: "cycleId and baseUrl are required." }, 400);

  const { data: cycle, error: cycleError } = await admin
    .from("ark_cycles")
    .select("id, kingdom_id, alliance_id, ark_date, signup_token, alliances(name, tag), ark_teams(team_number, battle_time, check_in_minutes)")
    .eq("id", payload.cycleId)
    .maybeSingle();
  if (cycleError || !cycle) return json({ error: cycleError?.message ?? "Ark cycle not found." }, 404);

  const { data: membership, error: membershipError } = await admin
    .from("memberships")
    .select("role, kingdom_id, alliance_id")
    .eq("user_id", authData.user.id)
    .eq("is_active", true)
    .eq("kingdom_id", cycle.kingdom_id)
    .limit(1)
    .maybeSingle();
  if (membershipError) return json({ error: membershipError.message }, 400);

  const kingdomLeadership = membership?.role === "event_director" || membership?.role === "council";
  const allianceLeadership = membership?.alliance_id === cycle.alliance_id && ["alliance_lead", "alliance_r4", "alliance_r5"].includes(membership?.role ?? "");
  if (!kingdomLeadership && !allianceLeadership) return json({ error: "Ark leadership access is required." }, 403);

  const teams = [...(cycle.ark_teams ?? [])].sort((a, b) => Number(a.team_number) - Number(b.team_number));
  if (teams.length !== 3 || teams.some((team) => !team.battle_time)) {
    return json({ error: "Set all three Ark battle times before publishing availability." }, 409);
  }

  let baseUrl: string;
  try {
    baseUrl = safeBaseUrl(payload.baseUrl);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Invalid Conclave URL." }, 400);
  }

  const signupUrl = `${baseUrl}/ark/respond/${cycle.signup_token}`;
  const alliance = Array.isArray(cycle.alliances) ? cycle.alliances[0] : cycle.alliances;
  const teamLines = teams.map((team) => {
    const unix = Math.floor(new Date(team.battle_time).getTime() / 1000);
    return `**Team ${team.team_number}:** <t:${unix}:F>  •  <t:${unix}:R>`;
  }).join("\n");

  try {
    const webhookUrl = cleanWebhookUrl(webhookSecret);
    webhookUrl.searchParams.set("wait", "true");
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Conclave",
        embeds: [{
          title: `⚔️ Ark of Osiris Availability — ${alliance?.tag ? `[${alliance.tag}]` : "Alliance"}`,
          description: [
            "We are organizing **three Ark of Osiris teams**. Select every time you can reliably attend.",
            "",
            teamLines,
            "",
            `### [Submit your Ark availability](${signupUrl})`,
            "Select your Rise of Kingdoms governor name and mark every team time you can attend. You can return to the same link to change your response.",
            "",
            "Discord displays the times above in your local timezone automatically."
          ].join("\n"),
          color: 12094010,
          footer: { text: "Conclave • Ark of Osiris Operations" },
          timestamp: new Date().toISOString()
        }],
        allowed_mentions: { parse: [] }
      })
    });

    if (!response.ok) return json({ error: await response.text() }, 502);
    const message = await response.json();
    const publishedAt = new Date().toISOString();

    const { error: updateError } = await admin.from("ark_cycles").update({
      signup_open: true,
      signup_published_at: publishedAt,
      signup_message_id: message.id ?? null,
      updated_at: publishedAt
    }).eq("id", cycle.id);
    if (updateError) return json({ error: updateError.message }, 500);

    return json({ ok: true, signupUrl, messageId: message.id ?? null, publishedAt });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unable to publish Ark signup." }, 502);
  }
});
