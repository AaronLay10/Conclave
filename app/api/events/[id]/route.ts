import { NextResponse } from "next/server";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const eventIdSchema = z.string().uuid();

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  const { id } = await params;
  const parsedId = eventIdSchema.safeParse(id);

  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid event ID." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, name, kingdom_id")
    .eq("id", parsedId.data)
    .maybeSingle();

  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 400 });
  }

  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("kingdom_id", event.kingdom_id)
    .eq("is_active", true)
    .maybeSingle();

  if (membershipError) {
    return NextResponse.json(
      { error: membershipError.message },
      { status: 400 }
    );
  }

  if (membership?.role !== "event_director") {
    return NextResponse.json(
      { error: "Only an Event Director can delete events." },
      { status: 403 }
    );
  }

  const { data: deletedEvent, error: deleteError } = await supabase
    .from("events")
    .delete()
    .eq("id", event.id)
    .select("id, name")
    .maybeSingle();

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  if (!deletedEvent) {
    return NextResponse.json(
      { error: "The event could not be deleted." },
      { status: 403 }
    );
  }

  return NextResponse.json({ deletedEvent });
}
