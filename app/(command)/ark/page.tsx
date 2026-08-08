import { ArkManager } from "@/components/ark-manager";
import { DemoBanner } from "@/components/demo-banner";
import { getCurrentMembership, getLatestActivitySnapshot } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function ArkPage() {
  const [snapshot, membership] = await Promise.all([
    getLatestActivitySnapshot(),
    getCurrentMembership()
  ]);

  const targetAllianceId = membership?.alliance_id ?? snapshot?.alliance_id ?? null;
  let savedPlan: unknown = null;
  if (isSupabaseConfigured() && targetAllianceId) {
    const supabase = await createClient();
    const { data: cycle } = await supabase
      .from("ark_cycles")
      .select("id, ark_date, title, status, source_import_id, ark_teams(id, team_number, battle_time, check_in_minutes, captain_governor_id, notes, ark_assignments(*))")
      .eq("alliance_id", targetAllianceId)
      .order("ark_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    savedPlan = cycle;
  }

  return (
    <>
      <DemoBanner />
      <div className="page-header">
        <div>
          <h1>Ark of Osiris</h1>
          <p className="muted">Build three 30-player teams from the latest Hero Scrolls roster, set match times, and generate alliance mail.</p>
        </div>
      </div>
      <ArkManager
        allianceTag={snapshot?.alliance_tag || membership?.alliance_tag || ""}
        sourceImportId={snapshot?.id ?? null}
        sourceLabel={snapshot ? `${snapshot.activity_source_name} · ${snapshot.activity_period_end}` : null}
        members={snapshot?.members ?? []}
        savedPlan={savedPlan}
      />
    </>
  );
}
