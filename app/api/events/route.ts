import { NextResponse } from "next/server";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

function utcMillis(value: string) {
  return Date.parse(value.endsWith("Z") ? value : `${value}Z`);
}

function utcIso(value: string) {
  return new Date(utcMillis(value)).toISOString();
}

const eventSchema = z.object({
  name: z.string().min(3).max(120),
  category: z.string().min(2).max(80),
  scope: z.enum(["kingdom", "alliance"]),
  certainty: z.enum(["confirmed", "predicted", "leadership_scheduled", "tbd"]),
  status: z.enum(["draft", "review", "approved", "published", "active", "completed", "archived"]),
  start_at: z.string().min(1),
  end_at: z.string().min(1),
  location: z.string().max(200).optional(),
  description: z.string().optional(),
  preparation: z.string().optional(),
  rules: z.string().optional()
}).refine((data) => utcMillis(data.end_at) > utcMillis(data.start_at), {
  message: "End time must be after start time.",
  path: ["end_at"]
});

function optionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  const body = await request.json();
  const parsed = eventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid event." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("kingdom_id, alliance_id, alliances(name, tag)")
    .eq("user_id", authData.user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) {
    return NextResponse.json(
      { error: "No active kingdom membership was found for this account." },
      { status: 403 }
    );
  }

  const values = parsed.data;
  const alliance = Array.isArray(membership.alliances)
    ? membership.alliances[0]
    : membership.alliances;

  const ownerName =
    authData.user.user_metadata?.full_name ??
    authData.user.user_metadata?.name ??
    authData.user.email?.split("@")[0] ??
    "Event Director";

  const allianceName =
    alliance && "name" in alliance
      ? `${alliance.name}${alliance.tag ? ` [${alliance.tag}]` : ""}`
      : null;

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      name: values.name.trim(),
      category: values.category.trim(),
      scope: values.scope,
      certainty: values.certainty,
      status: values.status,
      start_at: utcIso(values.start_at),
      end_at: utcIso(values.end_at),
      location: optionalText(values.location),
      description: optionalText(values.description),
      preparation: optionalText(values.preparation),
      rules: optionalText(values.rules),
      slug: `${slugify(values.name)}-${Date.now()}`,
      kingdom_id: membership.kingdom_id,
      alliance_id: values.scope === "alliance" ? membership.alliance_id : null,
      alliance_name: values.scope === "alliance" ? allianceName : null,
      created_by: authData.user.id,
      owner_id: authData.user.id,
      owner_name: ownerName
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ event }, { status: 201 });
}
