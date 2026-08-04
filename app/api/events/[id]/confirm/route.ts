import { NextResponse } from "next/server";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const eventIdSchema = z.string().uuid();

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const parsedId = eventIdSchema.safeParse((await params).id);
  if (!parsedId.success) return NextResponse.json({ error: "Invalid event ID." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, kingdom_id, certainty, source_details")
    .eq("id", parsedId.data)
    .maybeSingle();
  if (eventError) return NextResponse.json({ error: eventError.message }, { status: 400 });
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("kingdom_id", event.kingdom_id)
    .eq("is_active", true)
    .maybeSingle();
  if (membershipError) return NextResponse.json({ error: membershipError.message }, { status: 400 });
  if (membership?.role !== "event_director") {
    return NextResponse.json({ error: "Only an Event Director can confirm predictions." }, { status: 403 });
  }
  if (event.certainty !== "predicted") {
    return NextResponse.json({ error: "Only predicted events can be confirmed here." }, { status: 409 });
  }

  const { data: updated, error: updateError } = await supabase
    .from("events")
    .update({
      certainty: "confirmed",
      source_details: {
        ...(event.source_details ?? {}),
        confirmed_from_prediction_at: new Date().toISOString(),
        confirmed_by: user.id
      }
    })
    .eq("id", event.id)
    .eq("certainty", "predicted")
    .select("*")
    .maybeSingle();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });
  if (!updated) return NextResponse.json({ error: "This prediction was already reviewed." }, { status: 409 });
  return NextResponse.json({ event: updated });
}
