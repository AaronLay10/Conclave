import { NextResponse } from "next/server";
import { z } from "zod";
import {
  calculateActivityScores,
  DEFAULT_ACTIVITY_SCORE_CONFIG
} from "@/lib/activity-score";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const activityRowSchema = z.object({
  governor_id: z.string().min(3).max(30),
  governor_name: z.string().min(1).max(120),
  building_points: z.number().nonnegative(),
  tech_donations: z.number().nonnegative(),
  resource_assistance: z.number().nonnegative(),
  helps_given: z.number().nonnegative()
});

const fortRowSchema = z.object({
  governor_id: z.string().min(3).max(30),
  governor_name: z.string().min(1).max(120),
  adjusted_points: z.number().nonnegative(),
  launches: z.number().int().nonnegative(),
  joins: z.number().int().nonnegative(),
  mistakes: z.number().int().nonnegative()
});

const scoreConfigSchema = z.object({
  weights: z.object({
    building: z.number().min(0).max(1),
    tech: z.number().min(0).max(1),
    resources: z.number().min(0).max(1),
    helps: z.number().min(0).max(1),
    forts: z.number().min(0).max(1)
  }),
  targets: z.object({
    building: z.number().positive(),
    tech: z.number().positive(),
    resources: z.number().positive(),
    helps: z.number().positive(),
    fortPointsPerWeek: z.number().positive()
  }),
  fortWeeks: z.number().positive().max(52)
}).refine((config) => {
  const total = Object.values(config.weights).reduce((sum, weight) => sum + weight, 0);
  return Math.abs(total - 1) < 0.0001;
}, "Score weights must total 100%.");

const importSchema = z.object({
  alliance_tag: z.string().min(1).max(20),
  activity_period_start: z.iso.date(),
  activity_period_end: z.iso.date(),
  fort_period_start: z.iso.date(),
  fort_period_end: z.iso.date(),
  activity_source_name: z.string().min(1).max(255),
  fort_source_name: z.string().min(1).max(255),
  replace_existing: z.boolean().default(false),
  score_config: scoreConfigSchema.default(DEFAULT_ACTIVITY_SCORE_CONFIG),
  activity_rows: z.array(activityRowSchema).min(1).max(1_000),
  fort_rows: z.array(fortRowSchema).min(1).max(5_000)
}).superRefine((value, context) => {
  if (value.activity_period_end < value.activity_period_start) {
    context.addIssue({ code: "custom", path: ["activity_period_end"], message: "Activity end date must follow its start date." });
  }
  if (value.fort_period_end < value.fort_period_start) {
    context.addIssue({ code: "custom", path: ["fort_period_end"], message: "Fort end date must follow its start date." });
  }
  const governorIds = new Set<string>();
  value.activity_rows.forEach((row, index) => {
    if (governorIds.has(row.governor_id)) {
      context.addIssue({ code: "custom", path: ["activity_rows", index, "governor_id"], message: `Duplicate Governor ID ${row.governor_id}.` });
    }
    governorIds.add(row.governor_id);
  });
});

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured. Preview works locally, but saving requires the Conclave database." }, { status: 503 });
  }

  const parsed = importSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({ error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Invalid activity import." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("kingdom_id, alliance_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (membershipError) return NextResponse.json({ error: membershipError.message }, { status: 400 });
  if (!membership || membership.role !== "event_director") {
    return NextResponse.json({ error: "Only an Event Director can import activity." }, { status: 403 });
  }

  const { data: alliance, error: allianceError } = await supabase
    .from("alliances")
    .select("id, name, tag")
    .eq("kingdom_id", membership.kingdom_id)
    .eq("tag", parsed.data.alliance_tag)
    .maybeSingle();

  if (allianceError) return NextResponse.json({ error: allianceError.message }, { status: 400 });
  if (!alliance) return NextResponse.json({ error: `Alliance [${parsed.data.alliance_tag}] does not exist in this kingdom.` }, { status: 400 });
  const periodMatch = {
    alliance_id: alliance.id,
    activity_period_start: parsed.data.activity_period_start,
    activity_period_end: parsed.data.activity_period_end,
    fort_period_start: parsed.data.fort_period_start,
    fort_period_end: parsed.data.fort_period_end
  };
  const { data: existing, error: existingError } = await supabase
    .from("activity_imports")
    .select("id")
    .match(periodMatch)
    .maybeSingle();

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 400 });
  if (existing && !parsed.data.replace_existing) {
    return NextResponse.json({ error: "This alliance and reporting period already exists. Enable replacement to update it." }, { status: 409 });
  }
  if (existing) {
    const { error: deleteError } = await supabase.from("activity_imports").delete().eq("id", existing.id);
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  const fortStartTime = Date.parse(`${parsed.data.fort_period_start}T00:00:00Z`);
  const fortEndTime = Date.parse(`${parsed.data.fort_period_end}T00:00:00Z`);
  const fortWeeks = (fortEndTime - fortStartTime + 24 * 60 * 60 * 1000) / (7 * 24 * 60 * 60 * 1000);
  const scoreConfig = { ...parsed.data.score_config, fortWeeks };
  const scores = calculateActivityScores(parsed.data.activity_rows, parsed.data.fort_rows, scoreConfig);
  const { data: activityImport, error: importError } = await supabase
    .from("activity_imports")
    .insert({
      ...periodMatch,
      kingdom_id: membership.kingdom_id,
      activity_source_name: parsed.data.activity_source_name,
      fort_source_name: parsed.data.fort_source_name,
      score_config: scoreConfig,
      created_by: user.id
    })
    .select("id")
    .single();

  if (importError) return NextResponse.json({ error: importError.message }, { status: 400 });

  const { error: scoresError } = await supabase.from("activity_member_scores").insert(
    scores.map((score) => ({ import_id: activityImport.id, ...score }))
  );
  if (scoresError) {
    await supabase.from("activity_imports").delete().eq("id", activityImport.id);
    return NextResponse.json({ error: scoresError.message }, { status: 400 });
  }

  await supabase.from("audit_logs").insert({
    kingdom_id: membership.kingdom_id,
    actor_id: user.id,
    entity_type: "activity_import",
    entity_id: activityImport.id,
    action: existing ? "replaced" : "created",
    metadata: { alliance_tag: alliance.tag, members: scores.length }
  });

  return NextResponse.json({ import_id: activityImport.id, members: scores.length, replaced: Boolean(existing) });
}
