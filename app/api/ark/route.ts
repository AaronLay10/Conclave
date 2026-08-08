import { NextResponse } from "next/server";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const assignmentSchema = z.object({
  governor_id: z.string().min(1).max(30),
  governor_name: z.string().min(1).max(120),
  activity_rank: z.number().int().nonnegative(),
  activity_score: z.number().nonnegative(),
  role: z.enum(["captain", "rally", "garrison", "field", "ark_runner", "flex"]),
  battlefield_group: z.enum(["top", "bottom", "center", "flex"]),
  confirmed: z.boolean()
});

const availabilitySchema = z.object({
  governor_id: z.string().min(1).max(30),
  governor_name: z.string().min(1).max(120),
  team_1_available: z.boolean().nullable(),
  team_2_available: z.boolean().nullable(),
  team_3_available: z.boolean().nullable()
});

const teamSchema = z.object({
  team_number: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  battle_time: z.string(),
  check_in_minutes: z.number().int().min(0).max(120),
  assignments: z.array(assignmentSchema).max(30)
});

const planSchema = z.object({
  ark_date: z.iso.date(),
  source_import_id: z.string().uuid(),
  teams: z.array(teamSchema).length(3),
  availability: z.array(availabilitySchema).max(1000)
}).superRefine((value, context) => {
  const teamNumbers = new Set(value.teams.map((team) => team.team_number));
  if (teamNumbers.size !== 3) context.addIssue({ code: "custom", path: ["teams"], message: "Teams 1, 2, and 3 are required." });
  const governorIds = new Set<string>();
  value.teams.forEach((team, teamIndex) => team.assignments.forEach((assignment, assignmentIndex) => {
    if (governorIds.has(assignment.governor_id)) context.addIssue({ code: "custom", path: ["teams", teamIndex, "assignments", assignmentIndex], message: `${assignment.governor_name} is assigned more than once.` });
    governorIds.add(assignment.governor_id);
  }));
});

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });

  const parsed = planSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({ error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Invalid Ark plan." }, { status: 400 });
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
  if (!membership || !["event_director", "council", "alliance_lead", "alliance_r4", "alliance_r5"].includes(membership.role)) {
    return NextResponse.json({ error: "Alliance leadership access is required." }, { status: 403 });
  }

  const { data: sourceImport, error: sourceError } = await supabase
    .from("activity_imports")
    .select("id, alliance_id, kingdom_id")
    .eq("id", parsed.data.source_import_id)
    .eq("kingdom_id", membership.kingdom_id)
    .maybeSingle();
  if (sourceError) return NextResponse.json({ error: sourceError.message }, { status: 400 });
  if (!sourceImport) return NextResponse.json({ error: "The selected Hero Scrolls import is not available in this kingdom." }, { status: 400 });

  const isKingdomLeadership = membership.role === "event_director" || membership.role === "council";
  if (!isKingdomLeadership && membership.alliance_id !== sourceImport.alliance_id) {
    return NextResponse.json({ error: "You can only manage Ark for your own alliance." }, { status: 403 });
  }
  const targetAllianceId = sourceImport.alliance_id;

  const { data: existingCycle, error: existingCycleError } = await supabase
    .from("ark_cycles")
    .select("id, signup_token, signup_open")
    .eq("alliance_id", targetAllianceId)
    .eq("ark_date", parsed.data.ark_date)
    .maybeSingle();
  if (existingCycleError) return NextResponse.json({ error: existingCycleError.message }, { status: 400 });

  let cycleId = existingCycle?.id as string | undefined;
  let signupToken = existingCycle?.signup_token as string | undefined;
  let signupOpen = Boolean(existingCycle?.signup_open);
  if (cycleId) {
    const { data: updatedCycle, error } = await supabase.from("ark_cycles").update({ source_import_id: sourceImport.id, updated_at: new Date().toISOString() }).eq("id", cycleId).select("signup_token, signup_open").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    signupToken = updatedCycle.signup_token;
    signupOpen = Boolean(updatedCycle.signup_open);
  } else {
    const { data: cycle, error } = await supabase.from("ark_cycles").insert({ kingdom_id: membership.kingdom_id, alliance_id: targetAllianceId, source_import_id: sourceImport.id, ark_date: parsed.data.ark_date, created_by: user.id }).select("id, signup_token, signup_open").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    cycleId = cycle.id;
    signupToken = cycle.signup_token;
    signupOpen = Boolean(cycle.signup_open);
  }

  const { data: oldTeams, error: oldTeamError } = await supabase.from("ark_teams").select("id").eq("cycle_id", cycleId);
  if (oldTeamError) return NextResponse.json({ error: oldTeamError.message }, { status: 400 });
  if (oldTeams?.length) {
    const { error: deleteError } = await supabase.from("ark_teams").delete().eq("cycle_id", cycleId);
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  let assignmentCount = 0;
  for (const team of parsed.data.teams) {
    const battleTime = team.battle_time ? new Date(`${team.battle_time}:00Z`).toISOString() : null;
    const captain = team.assignments.find((assignment) => assignment.role === "captain")?.governor_id ?? null;
    const { data: savedTeam, error: teamError } = await supabase.from("ark_teams").insert({ cycle_id: cycleId, team_number: team.team_number, battle_time: battleTime, check_in_minutes: team.check_in_minutes, captain_governor_id: captain }).select("id").single();
    if (teamError) return NextResponse.json({ error: teamError.message }, { status: 400 });

    if (team.assignments.length) {
      const { error: assignmentError } = await supabase.from("ark_assignments").insert(team.assignments.map((assignment) => ({ team_id: savedTeam.id, ...assignment })));
      if (assignmentError) return NextResponse.json({ error: assignmentError.message }, { status: 400 });
      assignmentCount += team.assignments.length;
    }
  }

  if (parsed.data.availability.length) {
    const { error: availabilityError } = await supabase.from("ark_availability").upsert(
      parsed.data.availability.map((row) => ({ cycle_id: cycleId, ...row, updated_at: new Date().toISOString() })),
      { onConflict: "cycle_id,governor_id" }
    );
    if (availabilityError) return NextResponse.json({ error: availabilityError.message }, { status: 400 });
  }

  await supabase.from("audit_logs").insert({
    kingdom_id: membership.kingdom_id,
    actor_id: user.id,
    entity_type: "ark_cycle",
    entity_id: cycleId,
    action: existingCycle ? "updated" : "created",
    metadata: { alliance_id: targetAllianceId, ark_date: parsed.data.ark_date, assignments: assignmentCount, availability_records: parsed.data.availability.length, source_import_id: sourceImport.id }
  });

  return NextResponse.json({
    cycle_id: cycleId,
    assignments: assignmentCount,
    availability: parsed.data.availability.length,
    signup_token: signupToken,
    signup_open: signupOpen
  });
}
