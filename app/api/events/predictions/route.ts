import { NextResponse } from "next/server";
import { z } from "zod";
import { buildPredictions } from "@/lib/event-prediction";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

const requestSchema = z.object({
  horizon_days: z.number().int().min(14).max(180).default(90)
});

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid horizon." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("kingdom_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (membershipError) return NextResponse.json({ error: membershipError.message }, { status: 400 });
  if (!membership || membership.role !== "event_director") {
    return NextResponse.json({ error: "Only an Event Director can generate predictions." }, { status: 403 });
  }

  const from = new Date();
  from.setUTCHours(0, 0, 0, 0);
  const through = new Date(from.getTime() + parsed.data.horizon_days * 86_400_000);
  const { data: existing, error: existingError } = await supabase
    .from("events")
    .select("name, start_at, end_at, import_key")
    .eq("kingdom_id", membership.kingdom_id)
    .lte("start_at", through.toISOString())
    .gte("end_at", from.toISOString());

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 400 });

  const predictions = buildPredictions({ from, through, existingEvents: existing ?? [] });
  if (predictions.length === 0) {
    return NextResponse.json({ inserted: 0, skipped: existing?.length ?? 0, through: through.toISOString() });
  }

  const ownerName = user.user_metadata?.full_name
    ?? user.user_metadata?.name
    ?? user.email?.split("@")[0]
    ?? "Event Director";
  const generatedAt = new Date().toISOString();
  const rows = predictions.map((prediction) => ({
    ...prediction,
    kingdom_id: membership.kingdom_id,
    alliance_id: null,
    created_by: user.id,
    owner_id: user.id,
    owner_name: ownerName,
    slug: `${slugify(prediction.name)}-${prediction.start_at.slice(0, 10)}`,
    status: "review",
    source_kind: "prediction",
    source_details: { ...prediction.source_details, generated_at: generatedAt },
    imported_at: generatedAt
  }));

  const { error: insertError } = await supabase.from("events").insert(rows);
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });

  return NextResponse.json({ inserted: rows.length, skipped: (existing?.length ?? 0), through: through.toISOString() });
}
