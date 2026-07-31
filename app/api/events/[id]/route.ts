import { NextResponse } from "next/server";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const eventIdSchema = z.string().uuid();

function utcMillis(value: string) {
  return Date.parse(value.endsWith("Z") ? value : `${value}Z`);
}

function utcIso(value: string) {
  return new Date(utcMillis(value)).toISOString();
}

const eventUpdateSchema = z.object({
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

export async function PATCH(
  request: Request,
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

  const body = await request.json();
  const parsed = eventUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid event." },
      { status: 400 }
    );
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

  const { data: existingEvent, error: eventError } = await supabase
    .from("events")
    .select("id, kingdom_id")
    .eq("id", parsedId.data)
    .maybeSingle();

  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 400 });
  }

  if (!existingEvent) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("role, alliance_id, alliances(name, tag)")
    .eq("user_id", user.id)
    .eq("kingdom_id", existingEvent.kingdom_id)
    .eq("is_active", true)
    .maybeSingle();

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 400 });
  }

  if (membership?.role !== "event_director") {
    return NextResponse.json(
      { error: "Only an Event Director can edit events." },
      { status: 403 }
    );
  }

  const values = parsed.data;
  const alliance = Array.isArray(membership.alliances)
    ? membership.alliances[0]
    : membership.alliances;
  const allianceName =
    alliance && "name" in alliance
      ? `${alliance.name}${alliance.tag ? ` [${alliance.tag}]` : ""}`
      : null;

  if (values.scope === "alliance" && !membership.alliance_id) {
    return NextResponse.json(
      { error: "Your membership is not assigned to an alliance." },
      { status: 400 }
    );
  }

  const { data: event, error: updateError } = await supabase
    .from("events")
    .update({
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
      alliance_id: values.scope === "alliance" ? membership.alliance_id : null,
      alliance_name: values.scope === "alliance" ? allianceName : null
    })
    .eq("id", existingEvent.id)
    .select("*")
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  if (!event) {
    return NextResponse.json(
      { error: "The event could not be updated." },
      { status: 403 }
    );
  }

  return NextResponse.json({ event });
}

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
