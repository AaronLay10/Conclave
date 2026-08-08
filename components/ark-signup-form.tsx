"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clock3, ShieldCheck } from "lucide-react";

type SignupTeam = {
  team_number: number;
  battle_time: string | null;
  check_in_minutes: number;
};

type SignupMember = {
  governor_id: string;
  governor_name: string;
};

type SignupData = {
  ark_date: string;
  alliance_name: string;
  alliance_tag: string;
  teams: SignupTeam[];
  members: SignupMember[];
};

function formatUtc(value: string | null) {
  if (!value) return "Time not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time not set";
  return `${new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC"
  }).format(date)} UTC`;
}

export function ArkSignupForm({ token, signup }: { token: string; signup: SignupData }) {
  const [governorId, setGovernorId] = useState("");
  const [availability, setAvailability] = useState<Record<number, boolean>>({ 1: false, 2: false, 3: false });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const teams = useMemo(() => [...signup.teams].sort((a, b) => a.team_number - b.team_number), [signup.teams]);

  async function submit() {
    if (!governorId) {
      setError("Select your governor name first.");
      return;
    }
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/ark/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          governor_id: governorId,
          team_1_available: Boolean(availability[1]),
          team_2_available: Boolean(availability[2]),
          team_3_available: Boolean(availability[3])
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to save availability.");
      setMessage(`Saved availability for ${data.governor_name}. You may submit again later to change it.`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save availability.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "32px 18px 64px" }}>
      <section className="card">
        <div className="card-body" style={{ display: "grid", gap: 22 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div className="row"><ShieldCheck size={20} /><strong>{signup.alliance_name} [{signup.alliance_tag}]</strong></div>
            <h1 style={{ margin: 0 }}>Ark of Osiris Availability</h1>
            <p className="muted" style={{ margin: 0 }}>Select every match time you can reliably attend. Leadership will use these responses to build the three 30-player teams.</p>
          </div>

          <div className="field">
            <label htmlFor="governor">Your Rise of Kingdoms governor</label>
            <select id="governor" value={governorId} onChange={(event) => setGovernorId(event.target.value)}>
              <option value="">Select your governor name…</option>
              {signup.members.map((member) => <option key={member.governor_id} value={member.governor_id}>{member.governor_name}</option>)}
            </select>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {teams.map((team) => {
              const selected = Boolean(availability[team.team_number]);
              return (
                <button
                  key={team.team_number}
                  type="button"
                  onClick={() => setAvailability((current) => ({ ...current, [team.team_number]: !selected }))}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "42px 1fr auto",
                    alignItems: "center",
                    gap: 12,
                    textAlign: "left",
                    padding: 14,
                    borderRadius: 10,
                    border: selected ? "2px solid #356c45" : "1px solid var(--border,#333b46)",
                    background: selected ? "rgba(43,110,64,.18)" : "rgba(255,255,255,.02)",
                    color: "inherit",
                    cursor: "pointer"
                  }}
                >
                  <span style={{ width: 32, height: 32, borderRadius: 20, display: "grid", placeItems: "center", border: "1px solid currentColor" }}>{selected ? "✓" : ""}</span>
                  <span style={{ display: "grid", gap: 3 }}><strong>Team {team.team_number}</strong><span>{formatUtc(team.battle_time)}</span></span>
                  <span className="muted"><Clock3 size={15} /> {team.check_in_minutes}m early</span>
                </button>
              );
            })}
          </div>

          <p className="muted" style={{ margin: 0, fontSize: ".85rem" }}>Leave a team unchecked if you cannot attend that time. It is valid to leave all three unchecked if none of the times work.</p>

          {error && <div className="form-error">{error}</div>}
          {message && <div className="form-success row"><CheckCircle2 size={17} /> {message}</div>}

          <button className="button primary" type="button" disabled={submitting || !governorId} onClick={submit}>
            {submitting ? "Saving…" : "Submit Ark Availability"}
          </button>
        </div>
      </section>
    </main>
  );
}
