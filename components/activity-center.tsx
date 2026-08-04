"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  CheckCircle2,
  FileSpreadsheet,
  Search,
  ShieldCheck,
  Upload
} from "lucide-react";
import {
  calculateActivityScores,
  DEFAULT_ACTIVITY_SCORE_CONFIG,
  parseActivityCsv,
  parseFortsCsv,
  type ActivitySourceRow,
  type FortSourceRow
} from "@/lib/activity-score";
import type { ActivityMemberScore, ActivitySnapshot, ActivityTier } from "@/lib/types";

const tiers: ActivityTier[] = ["Exceptional", "Strong", "Active", "Light", "At Risk"];

function formatted(value: number, digits = 0) {
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function shortDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function weeksInclusive(start: string, end: string) {
  const startTime = Date.parse(`${start}T00:00:00Z`);
  const endTime = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) return 1;
  return (endTime - startTime + 24 * 60 * 60 * 1000) / (7 * 24 * 60 * 60 * 1000);
}

function scoreSummary(members: ActivityMemberScore[]) {
  const average = members.length
    ? members.reduce((sum, member) => sum + member.activity_score, 0) / members.length
    : 0;
  return {
    average,
    strongPlus: members.filter((member) => member.tier === "Exceptional" || member.tier === "Strong").length,
    atRisk: members.filter((member) => member.tier === "At Risk").length
  };
}

export function ActivityCenter({ initialSnapshot }: { initialSnapshot: ActivitySnapshot | null }) {
  const router = useRouter();
  const [activityRows, setActivityRows] = useState<ActivitySourceRow[] | null>(null);
  const [fortRows, setFortRows] = useState<FortSourceRow[] | null>(null);
  const [activityFileName, setActivityFileName] = useState("");
  const [fortFileName, setFortFileName] = useState("");
  const [allianceTag, setAllianceTag] = useState(initialSnapshot?.alliance_tag || "126V");
  const [activityStart, setActivityStart] = useState("2026-07-27");
  const [activityEnd, setActivityEnd] = useState("2026-08-02");
  const [fortStart, setFortStart] = useState("2026-07-11");
  const [fortEnd, setFortEnd] = useState("2026-07-31");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [query, setQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<"All" | ActivityTier>("All");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const scoreConfig = useMemo(() => ({
    ...DEFAULT_ACTIVITY_SCORE_CONFIG,
    fortWeeks: weeksInclusive(fortStart, fortEnd)
  }), [fortStart, fortEnd]);
  const previewMembers = useMemo(() => {
    if (!activityRows || !fortRows) return null;
    return calculateActivityScores(activityRows, fortRows, scoreConfig);
  }, [activityRows, fortRows, scoreConfig]);
  const members = previewMembers ?? initialSnapshot?.members ?? [];
  const summary = scoreSummary(members);
  const filteredMembers = members.filter((member) => {
    const matchesQuery = `${member.governor_name} ${member.governor_id}`.toLowerCase().includes(query.toLowerCase().trim());
    return matchesQuery && (tierFilter === "All" || member.tier === tierFilter);
  });

  async function loadActivity(file?: File) {
    if (!file) return;
    try {
      const rows = parseActivityCsv(await file.text());
      setActivityRows(rows);
      setActivityFileName(file.name);
      setError(null);
      setResult(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to read the Activity file.");
    }
  }

  async function loadForts(file?: File) {
    if (!file) return;
    try {
      const rows = parseFortsCsv(await file.text());
      setFortRows(rows);
      setFortFileName(file.name);
      setError(null);
      setResult(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to read the Forts file.");
    }
  }

  async function saveSnapshot() {
    if (!activityRows || !fortRows) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/activity/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alliance_tag: allianceTag,
          activity_period_start: activityStart,
          activity_period_end: activityEnd,
          fort_period_start: fortStart,
          fort_period_end: fortEnd,
          activity_source_name: activityFileName,
          fort_source_name: fortFileName,
          replace_existing: replaceExisting,
          score_config: scoreConfig,
          activity_rows: activityRows,
          fort_rows: fortRows
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "The activity import failed.");
      setResult(`${data.replaced ? "Replaced" : "Saved"} ${data.members} member scores.`);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The activity import failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="stack activity-center">
      <div className="grid cols-4">
        <div className="card stat-card">
          <div className="stat-label">Roster scored</div>
          <div className="stat-value">{members.length}</div>
          <div className="stat-meta">Members in the Activity report</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Average score</div>
          <div className="stat-value">{summary.average.toFixed(1)}</div>
          <div className="stat-meta">100-point activity model</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Strong or exceptional</div>
          <div className="stat-value">{summary.strongPlus}</div>
          <div className="stat-meta">Consistent all-around contributors</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">At risk</div>
          <div className="stat-value">{summary.atRisk}</div>
          <div className="stat-meta">Review before taking action</div>
        </div>
      </div>

      <section className="section grid activity-layout">
        <div className="card">
          <div className="card-header">
            <div className="row"><Upload size={18} /><strong>Hero Scrolls import</strong></div>
            <span className="badge leadership_scheduled">Leadership only</span>
          </div>
          <div className="card-body form">
            <div className="import-guidance">
              <ShieldCheck size={19} />
              <div>
                <strong>Preview first, save second</strong>
                <p>Conclave reads both files locally, matches Governor IDs, and recalculates every score. Nothing is saved until you confirm.</p>
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="activity-file">Week Activity CSV</label>
                <input id="activity-file" type="file" accept="text/csv,.csv" onChange={(event) => loadActivity(event.target.files?.[0])} />
                <small>{activityRows ? `${activityRows.length} members · ${activityFileName}` : "Hero Scrolls Activity export"}</small>
              </div>
              <div className="field">
                <label htmlFor="fort-file">Forts CSV</label>
                <input id="fort-file" type="file" accept="text/csv,.csv" onChange={(event) => loadForts(event.target.files?.[0])} />
                <small>{fortRows ? `${fortRows.length} fort records · ${fortFileName}` : "Hero Scrolls Forts export"}</small>
              </div>
              <div className="field">
                <label htmlFor="alliance-tag">Alliance tag</label>
                <input id="alliance-tag" value={allianceTag} onChange={(event) => setAllianceTag(event.target.value)} />
              </div>
              <div className="field">
                <label>Activity period</label>
                <div className="date-pair">
                  <input aria-label="Activity period start" type="date" value={activityStart} onChange={(event) => setActivityStart(event.target.value)} />
                  <input aria-label="Activity period end" type="date" value={activityEnd} onChange={(event) => setActivityEnd(event.target.value)} />
                </div>
              </div>
              <div className="field full">
                <label>Fort reporting period</label>
                <div className="date-pair">
                  <input aria-label="Fort period start" type="date" value={fortStart} onChange={(event) => setFortStart(event.target.value)} />
                  <input aria-label="Fort period end" type="date" value={fortEnd} onChange={(event) => setFortEnd(event.target.value)} />
                </div>
              </div>
            </div>
            <label className="import-replace">
              <input type="checkbox" checked={replaceExisting} onChange={(event) => setReplaceExisting(event.target.checked)} />
              <span><strong>Replace this reporting period</strong><small>Use when correcting the same week’s files.</small></span>
            </label>
            {previewMembers && (
              <div className="form-success row"><CheckCircle2 size={17} /> Preview ready: {previewMembers.length} members scored.</div>
            )}
            {error && <div className="form-error">{error}</div>}
            {result && <div className="form-success">{result}</div>}
            <button className="button primary" disabled={!previewMembers || submitting} onClick={saveSnapshot}>
              <Upload size={17} /> {submitting ? "Saving…" : "Save activity snapshot"}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="row"><Activity size={18} /><strong>Scoring model</strong></div>
            <span className="badge confirmed">100 points</span>
          </div>
          <div className="model-list">
            {[
              ["Fort participation", 30, "207 points/week"],
              ["Tech donations", 25, "62,000/week"],
              ["Helps given", 20, "1,930/week"],
              ["Building points", 15, "34,000/week"],
              ["Resource assistance", 10, "9.3M/week · log-scaled"]
            ].map(([label, weight, target]) => (
              <div className="model-row" key={String(label)}>
                <div><strong>{label}</strong><small>{target}</small></div>
                <span>{weight}%</span>
              </div>
            ))}
          </div>
          <div className="card-body activity-note">
            Scores cap each category at its target. Fort totals are normalized across {formatted(scoreConfig.fortWeeks, 2)} weeks for the selected period, so the final score is 70% weekly contribution behavior and 30% sustained fort activity.
          </div>
        </div>
      </section>

      <section className="section card">
        <div className="card-header activity-table-header">
          <div>
            <strong>{previewMembers ? "Import preview" : "Latest activity snapshot"}</strong>
            <small>
              {previewMembers
                ? `${activityFileName} + ${fortFileName}`
                : initialSnapshot
                  ? `${initialSnapshot.alliance_name} [${initialSnapshot.alliance_tag}] · ${shortDate(initialSnapshot.activity_period_start)}–${shortDate(initialSnapshot.activity_period_end)}`
                  : "Upload both reports to create the first snapshot."}
            </small>
          </div>
          <div className="activity-filters">
            <label className="search-field"><Search size={16} /><input aria-label="Search members" placeholder="Search name or ID" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
            <select aria-label="Filter activity tier" value={tierFilter} onChange={(event) => setTierFilter(event.target.value as "All" | ActivityTier)}>
              <option value="All">All tiers</option>
              {tiers.map((tier) => <option key={tier}>{tier}</option>)}
            </select>
          </div>
        </div>
        {members.length === 0 ? (
          <div className="empty"><FileSpreadsheet size={34} /><p>Choose the Week Activity and Forts CSV files above.</p></div>
        ) : (
          <div className="activity-table-wrap">
            <table className="activity-table">
              <thead><tr><th>Rank</th><th>Governor</th><th>Score</th><th>Tier</th><th>Tech</th><th>Helps</th><th>Fort / wk</th><th>Building</th><th>Resources</th><th>Note</th></tr></thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr key={member.governor_id}>
                    <td className="rank-cell">#{member.rank}</td>
                    <td><strong>{member.governor_name}</strong><small>{member.governor_id}</small></td>
                    <td className="score-cell"><strong>{member.activity_score.toFixed(1)}</strong><span><i style={{ width: `${Math.min(member.activity_score, 100)}%` }} /></span></td>
                    <td><span className={`activity-tier tier-${member.tier.toLowerCase().replace(" ", "-")}`}>{member.tier}</span></td>
                    <td>{formatted(member.tech_donations)}</td>
                    <td>{formatted(member.helps_given)}</td>
                    <td>{formatted(member.fort_points_per_week, 1)}</td>
                    <td>{formatted(member.building_points)}</td>
                    <td>{formatted(member.resource_assistance)}</td>
                    <td><small>{member.data_note ?? "—"}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
