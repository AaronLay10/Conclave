import { NextResponse } from "next/server";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const responseSchema = z.object({
  token: z.string().uuid(),
  governor_id: z.string().min(1).max(30),
  team_1_available: z.boolean(),
  team_2_available: z.boolean(),
  team_3_available: z.boolean()
});

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Conclave is not configured." }, { status: 503 });

  const parsed = responseSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({ error: issue?.message ?? "Invalid Ark availability response." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_ark_signup", {
    p_token: parsed.data.token,
    p_governor_id: parsed.data.governor_id,
    p_team_1_available: parsed.data.team_1_available,
    p_team_2_available: parsed.data.team_2_available,
    p_team_3_available: parsed.data.team_3_available
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data ?? { ok: true });
}
