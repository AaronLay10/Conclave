import { NextResponse } from "next/server";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { isAllianceLeadershipRole, type AppRole } from "@/lib/access-control";

const discordId = z.string().regex(/^\d{5,30}$/, "Enter a numeric Discord User ID.");
const accessRole = z.enum(["event_director", "council", "alliance_lead", "alliance_r4", "alliance_r5", "viewer"]);
const accessSchema = z.object({
  discord_user_id: discordId,
  display_name: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
  access_role: accessRole,
  alliance_id: z.uuid().nullable().optional()
}).superRefine((value, context) => {
  if (isAllianceLeadershipRole(value.access_role as AppRole) && !value.alliance_id) {
    context.addIssue({ code: "custom", path: ["alliance_id"], message: "Choose an alliance for this alliance role." });
  }
  if (!isAllianceLeadershipRole(value.access_role as AppRole) && value.alliance_id) {
    context.addIssue({ code: "custom", path: ["alliance_id"], message: "Alliance scope is only available to alliance leadership roles." });
  }
});
const addSchema = accessSchema;
const updateSchema = accessSchema.and(z.object({ is_active: z.boolean() }));
const deleteSchema = z.object({ discord_user_id: discordId });

function optional(value?: string) {
  return value?.trim() || null;
}

function metadataDiscordId(metadata: Record<string, unknown> | undefined) {
  const candidate = metadata?.provider_id ?? metadata?.sub;
  return typeof candidate === "string" ? candidate : null;
}

async function directorContext() {
  if (!isSupabaseConfigured()) return { error: "Supabase is not configured.", status: 503 } as const;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) return { error: "Authentication required.", status: 401 } as const;

  const { data: membership, error } = await supabase
    .from("memberships")
    .select("kingdom_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .eq("role", "event_director")
    .limit(1)
    .maybeSingle();
  if (error) return { error: error.message, status: 400 } as const;
  if (!membership) return { error: "Only an Event Director can manage login access.", status: 403 } as const;

  const currentDiscordId = metadataDiscordId(user.user_metadata as Record<string, unknown> | undefined);
  if (!currentDiscordId) return { error: "Your Discord User ID was not supplied by OAuth.", status: 400 } as const;
  return { supabase, user, membership, currentDiscordId } as const;
}

export async function GET() {
  const context = await directorContext();
  if ("error" in context) return NextResponse.json({ error: context.error }, { status: context.status });
  const { data, error } = await context.supabase
    .from("discord_login_allowlist")
    .select("id, discord_user_id, display_name, note, access_role, alliance_id, is_active, created_at, updated_at, alliances(name, tag)")
    .eq("kingdom_id", context.membership.kingdom_id)
    .order("display_name", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const { data: alliances, error: allianceError } = await context.supabase
    .from("alliances")
    .select("id, name, tag")
    .eq("kingdom_id", context.membership.kingdom_id)
    .eq("is_active", true)
    .order("tag");
  if (allianceError) return NextResponse.json({ error: allianceError.message }, { status: 400 });
  return NextResponse.json({ entries: data ?? [], alliances: alliances ?? [], current_discord_user_id: context.currentDiscordId });
}

async function allianceIsValid(context: Awaited<ReturnType<typeof directorContext>>, allianceId: string | null | undefined) {
  if ("error" in context || !allianceId) return !allianceId;
  const { data, error } = await context.supabase
    .from("alliances")
    .select("id")
    .eq("id", allianceId)
    .eq("kingdom_id", context.membership.kingdom_id)
    .eq("is_active", true)
    .maybeSingle();
  return !error && Boolean(data);
}

export async function POST(request: Request) {
  const context = await directorContext();
  if ("error" in context) return NextResponse.json({ error: context.error }, { status: context.status });
  const parsed = addSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid entry." }, { status: 400 });
  if (!(await allianceIsValid(context, parsed.data.alliance_id))) {
    return NextResponse.json({ error: "Choose an active alliance in this kingdom." }, { status: 400 });
  }

  const { count, error: countError } = await context.supabase
    .from("discord_login_allowlist")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);
  if (countError) return NextResponse.json({ error: countError.message }, { status: 400 });

  if ((count ?? 0) === 0) {
    const metadata = context.user.user_metadata as Record<string, unknown> | undefined;
    const currentName = metadata?.full_name ?? metadata?.name ?? context.user.email?.split("@")[0] ?? "Initial Event Director";
    const { error: bootstrapError } = await context.supabase
      .from("discord_login_allowlist")
      .upsert({
        discord_user_id: context.currentDiscordId,
        display_name: String(currentName),
        note: "Automatic bootstrap entry",
        access_role: "event_director",
        kingdom_id: context.membership.kingdom_id,
        alliance_id: null,
        is_active: true,
        created_by: context.user.id
      }, { onConflict: "discord_user_id" });
    if (bootstrapError) return NextResponse.json({ error: bootstrapError.message }, { status: 400 });
  }

  const { error } = await context.supabase
    .from("discord_login_allowlist")
    .upsert({
      discord_user_id: parsed.data.discord_user_id,
      display_name: optional(parsed.data.display_name),
      note: optional(parsed.data.note),
      access_role: parsed.data.access_role,
      kingdom_id: context.membership.kingdom_id,
      alliance_id: isAllianceLeadershipRole(parsed.data.access_role as AppRole) ? parsed.data.alliance_id : null,
      is_active: true,
      created_by: context.user.id
    }, { onConflict: "discord_user_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ saved: true });
}

export async function PATCH(request: Request) {
  const context = await directorContext();
  if ("error" in context) return NextResponse.json({ error: context.error }, { status: context.status });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid entry." }, { status: 400 });
  if (parsed.data.discord_user_id === context.currentDiscordId && !parsed.data.is_active) {
    return NextResponse.json({ error: "You cannot disable your own login entry." }, { status: 400 });
  }
  if (parsed.data.discord_user_id === context.currentDiscordId && parsed.data.access_role !== "event_director") {
    return NextResponse.json({ error: "You cannot remove your own Event Director access." }, { status: 400 });
  }
  if (!(await allianceIsValid(context, parsed.data.alliance_id))) {
    return NextResponse.json({ error: "Choose an active alliance in this kingdom." }, { status: 400 });
  }

  const { error } = await context.supabase
    .from("discord_login_allowlist")
    .update({
      display_name: optional(parsed.data.display_name),
      note: optional(parsed.data.note),
      access_role: parsed.data.access_role,
      alliance_id: isAllianceLeadershipRole(parsed.data.access_role as AppRole) ? parsed.data.alliance_id : null,
      is_active: parsed.data.is_active
    })
    .eq("discord_user_id", parsed.data.discord_user_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ saved: true });
}

export async function DELETE(request: Request) {
  const context = await directorContext();
  if ("error" in context) return NextResponse.json({ error: context.error }, { status: context.status });
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid entry." }, { status: 400 });
  if (parsed.data.discord_user_id === context.currentDiscordId) {
    return NextResponse.json({ error: "You cannot remove your own login entry." }, { status: 400 });
  }

  const { error } = await context.supabase
    .from("discord_login_allowlist")
    .delete()
    .eq("discord_user_id", parsed.data.discord_user_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ deleted: true });
}
