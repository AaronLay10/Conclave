"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, CheckCircle2, ShieldCheck, Upload } from "lucide-react";
import {
  calculateActivityScores,
  DEFAULT_ACTIVITY_SCORE_CONFIG,
  parseActivityCsv,
  parseFortsCsv,
  type ActivitySourceRow,
  type FortSourceRow
} from "@/lib/activity-score";

function formatted(value: number, digits = 0) {
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function weeksInclusive(start: string, end: string) {
  const startTime = Date.parse(`${start}T00:00:00Z`);
  const endTime = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) return 1;
  return (endTime - startTime + 24 * 60 * 60 * 1000) / (7 * 24 * 60 * 60 * 1000);
}

export function ActivityImporter({ defaultAllianceTag }: { defaultAllianceTag: string }) {
  const router = useRouter();
  const [activityRows, setActivityRows] = useState<ActivitySourceRow[] | null>(null);
  const [fortRows, setFortRows] = useState<FortSourceRow[] | null>(null);
  const [activityFileName, setActivityFileName] = useState("");
  const [fortFileName, setFortFileName] = useState("");
  const [allianceTag, setAllianceTag] = useState(defaultAllianceTag || "126V");
  const [activityStart, setActivityStart] = useState("2026-07-27");
  const [activityEnd, setActivityEnd] = useState("2026-08-02");
  const [fortStart, setFortStart] = useState("2026-07-11");
  const [fortEnd, setFortEnd] = useState("2026-07-31");
  const [replaceExisting, setReplaceExisting] = useState(false);
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
  const previewAverage = previewMembers?.length
    ? previewMembers.reduce((sum, member) => sum + member.activity_score, 0) / previewMembers.length
    : 0;

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
    <div className="stack">
      <section className="grid activity-layout">
        <div className="card">
          <div className="card-header">
            <div className="row"><Upload size={18} /><strong>Hero Scrolls reports</strong></div>
            <span className="badge leadership_scheduled">Event Director only</span>
          </div>
          <div className="card-body form">
            <div className="import-guidance">
              <ShieldCheck size={19} />
              <div><strong>Preview first, save second</strong><p>Conclave reads both files locally, matches Governor IDs, and recalculates every score. Nothing is saved until you confirm.</p></div>
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
            {previewMembers && <div className="form-success row"><CheckCircle2 size={17} /> Preview ready: {previewMembers.length} members · {previewAverage.toFixed(1)} average.</div>}
            {error && <div className="form-error">{error}</div>}
            {result && <div className="form-success">{result} <Link href="/activity"><u>Open member report</u></Link></div>}
            <button className="button primary" disabled={!previewMembers || submitting} onClick={saveSnapshot}>
              <Upload size={17} /> {submitting ? "Saving…" : "Save activity snapshot"}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="row"><Activity size={18} /><strong>Scoring model</strong></div><span className="badge confirmed">100 points</span></div>
          <div className="model-list">
            {[
              ["Fort participation", 30, "207 points/week"],
              ["Tech donations", 25, "62,000/week"],
              ["Helps given", 20, "1,930/week"],
              ["Building points", 15, "34,000/week"],
              ["Resource assistance", 10, "9.3M/week · log-scaled"]
            ].map(([label, weight, target]) => (
              <div className="model-row" key={String(label)}><div><strong>{label}</strong><small>{target}</small></div><span>{weight}%</span></div>
            ))}
          </div>
          <div className="card-body activity-note">Scores cap each category at its target. Fort totals are normalized across {formatted(scoreConfig.fortWeeks, 2)} weeks for the selected period.</div>
        </div>
      </section>
    </div>
  );
}
