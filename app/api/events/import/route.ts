import { NextResponse } from "next/server";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

const utcTimestamp = z.string().datetime({ offset: true }).refine(
  (value) => value.endsWith("Z"),
  "Use an explicit UTC timestamp ending in Z."
);

const importedEventSchema = z.object({
  import_key: z.string().min(3).max(180).regex(/^[a-z0-9][a-z0-9._:-]*$/),
  name: z.string().min(3).max(120),
  category: z.string().min(2).max(80),
  scope: z.enum(["kingdom", "alliance"]).default("kingdom"),
  alliance_tag: z.string().min(1).max(20).optional(),
  certainty: z.enum(["confirmed", "predicted", "leadership_scheduled", "tbd"]),
  start_at: utcTimestamp,
  end_at: utcTimestamp,
  location: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
  preparation: z.string().max(5000).optional(),
  rules: z.string().max(5000).optional(),
  source_ref: z.string().min(1).max(500),
  source_details: z.record(z.string(), z.unknown()).optional()
}).superRefine((event, context) => {
  if (Date.parse(event.end_at) <= Date.parse(event.start_at)) {
    context.addIssue({
      code: "custom",
      path: ["end_at"],
      message: "End time must be after start time."
    });
  }

  if (event.scope === "alliance" && !event.alliance_tag) {
    context.addIssue({
      code: "custom",
      path: ["alliance_tag"],
      message: "Alliance events require alliance_tag."
    });
  }
});

const importSchema = z.object({
  batch_name: z.string().min(3).max(120),
  replace_existing: z.boolean().default(false),
  events: z.array(importedEventSchema).min(1).max(100)
}).superRefine((batch, context) => {
  const seen = new Set<string>();
  batch.events.forEach((event, index) => {
    if (seen.has(event.import_key)) {
      context.addIssue({
        code: "custom",
        path: ["events", index, "import_key"],
        message: `Duplicate import_key in this batch: ${event.import_key}`
      });
    }
    seen.add(event.import_key);
  });
});

function optionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const parsed = importSchema.safeParse(body);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Invalid import." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("kingdom_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 400 });
  }

  if (!membership || membership.role !== "event_director") {
    return NextResponse.json(
      { error: "Only an Event Director can import calendar events." },
      { status: 403 }
    );
  }

  const allianceTags = [...new Set(
    parsed.data.events.flatMap((event) => event.alliance_tag ? [event.alliance_tag] : [])
  )];
  const allianceByTag = new Map<string, { id: string; name: string; tag: string }>();

  if (allianceTags.length > 0) {
    const { data: alliances, error: allianceError } = await supabase
      .from("alliances")
      .select("id, name, tag")
      .eq("kingdom_id", membership.kingdom_id)
      .in("tag", allianceTags);

    if (allianceError) {
      return NextResponse.json({ error: allianceError.message }, { status: 400 });
    }

    for (const alliance of alliances ?? []) allianceByTag.set(alliance.tag, alliance);
    const missingTag = allianceTags.find((tag) => !allianceByTag.has(tag));
    if (missingTag) {
      return NextResponse.json(
        { error: `Alliance [${missingTag}] does not exist in this kingdom.` },
        { status: 400 }
      );
    }
  }

  const importKeys = parsed.data.events.map((event) => event.import_key);
  const { data: existing, error: existingError } = await supabase
    .from("events")
    .select("id, import_key")
    .eq("kingdom_id", membership.kingdom_id)
    .in("import_key", importKeys);

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 400 });
  }

  const existingKeys = new Set((existing ?? []).map((event) => event.import_key));
  const candidates = parsed.data.replace_existing
    ? parsed.data.events
    : parsed.data.events.filter((event) => !existingKeys.has(event.import_key));

  if (candidates.length === 0) {
    return NextResponse.json({ inserted: 0, updated: 0, skipped: existingKeys.size });
  }

  const ownerName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "Event Director";
  const importedAt = new Date().toISOString();
  const rows = candidates.map((event) => {
    const alliance = event.alliance_tag ? allianceByTag.get(event.alliance_tag) : undefined;
    return {
      kingdom_id: membership.kingdom_id,
      alliance_id: alliance?.id ?? null,
      alliance_name: alliance ? `${alliance.name} [${alliance.tag}]` : null,
      created_by: user.id,
      owner_id: user.id,
      owner_name: ownerName,
      import_key: event.import_key,
      slug: `${slugify(membership.kingdom_id)}-${slugify(event.name)}-${slugify(event.import_key)}`,
      name: event.name.trim(),
      description: optionalText(event.description),
      category: event.category.trim(),
      scope: event.scope,
      status: "review",
      certainty: event.certainty,
      start_at: event.start_at,
      end_at: event.end_at,
      location: optionalText(event.location),
      preparation: optionalText(event.preparation),
      rules: optionalText(event.rules),
      source_kind: event.certainty === "predicted" ? "prediction" : "ingame_screenshot",
      source_ref: event.source_ref.trim(),
      source_details: {
        ...(event.source_details ?? {}),
        batch_name: parsed.data.batch_name
      },
      imported_at: importedAt
    };
  });

  const { error: importError } = await supabase
    .from("events")
    .upsert(rows, { onConflict: "kingdom_id,import_key" });

  if (importError) {
    return NextResponse.json({ error: importError.message }, { status: 400 });
  }

  const updated = parsed.data.replace_existing
    ? candidates.filter((event) => existingKeys.has(event.import_key)).length
    : 0;

  return NextResponse.json({
    inserted: candidates.length - updated,
    updated,
    skipped: parsed.data.events.length - candidates.length
  });
}
