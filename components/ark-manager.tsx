"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, Clipboard, Link as LinkIcon, RefreshCw, Save, Search, Send, Shield, Shuffle, Swords, Users, X } from "lucide-react";
import type { ActivityMemberScore } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import styles from "./ark-manager.module.css";

type ArkRole = "captain" | "rally" | "garrison" | "field" | "ark_runner" | "flex";
type ArkGroup = "top" | "bottom" | "center" | "flex";
type TeamNumber = 1 | 2 | 3;
type AvailabilityValue = boolean | null;

type Assignment = {
  governor_id: string;
  governor_name: string;
  activity_rank: number;
  activity_score: number;
  role: ArkRole;
  battlefield_group: ArkGroup;
  confirmed: boolean;
};

type Availability = {
  governor_id: string;
  governor_name: string;
  team_1_available: AvailabilityValue;
  team_2_available: AvailabilityValue;
  team_3_available: AvailabilityValue;
};

type TeamState = {
  team_number: TeamNumber;
  battle_time: string;
  check_in_minutes: number;
  assignments: Assignment[];
};

type SavedPlan = {
  id?: string;
  ark_date?: string;
  signup_token?: string;
  signup_open?: boolean;
  signup_published_at?: string | null;
  ark_teams?: Array<{
    team_number: TeamNumber;
    battle_time: string | null;
    check_in_minutes: number;
    ark_assignments?: Assignment[];
  }>;
  ark_availability?: Availability[];
} | null;

const teamNumbers = [1, 2, 3] as const;
const emptyTeams = (): TeamState[] => teamNumbers.map((team_number) => ({ team_number, battle_time: "", check_in_minutes: 30, assignments: [] }));

function localInputValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

function roleLabel(role: ArkRole) {
  return ({ captain: "Captain", rally: "Rally", garrison: "Garrison", field: "Field", ark_runner: "Ark Runner", flex: "Flex" })[role];
}

function availabilityKey(team: TeamNumber) {
  return `team_${team}_available` as const;
}

function defaultAssignment(member: ActivityMemberScore): Assignment {
  return {
    governor_id: member.governor_id,
    governor_name: member.governor_name,
    activity_rank: member.rank,
    activity_score: Number(member.activity_score),
    role: "field",
    battlefield_group: "flex",
    confirmed: false
  };
}

export function ArkManager({ allianceTag, sourceImportId, sourceLabel, members, savedPlan }: {
  allianceTag: string;
  sourceImportId: string | null;
  sourceLabel: string | null;
  members: ActivityMemberScore[];
  savedPlan: unknown;
}) {
  const plan = (savedPlan ?? null) as SavedPlan;
  const restoredTeams = emptyTeams().map((team) => {
    const saved = plan?.ark_teams?.find((candidate) => Number(candidate.team_number) === team.team_number);
    return saved ? {
      ...team,
      battle_time: localInputValue(saved.battle_time),
      check_in_minutes: saved.check_in_minutes ?? 30,
      assignments: (saved.ark_assignments ?? []).map((assignment) => ({ ...assignment, activity_rank: Number(assignment.activity_rank ?? 0), activity_score: Number(assignment.activity_score ?? 0) }))
    } : team;
  });

  const initialAvailability = Object.fromEntries((plan?.ark_availability ?? []).map((row) => [row.governor_id, row]));
  const [arkDate, setArkDate] = useState(plan?.ark_date ?? "");
  const [teams, setTeams] = useState<TeamState[]>(restoredTeams);
  const [availability, setAvailability] = useState<Record<string, Availability>>(initialAvailability);
  const [search, setSearch] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<TeamNumber>(1);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [mailTeam, setMailTeam] = useState<TeamNumber>(1);
  const [cycleId, setCycleId] = useState<string | null>(plan?.id ?? null);
  const [signupToken, setSignupToken] = useState<string | null>(plan?.signup_token ?? null);
  const [signupOpen, setSignupOpen] = useState(Boolean(plan?.signup_open));

  const assignedIds = useMemo(() => new Set(teams.flatMap((team) => team.assignments.map((member) => member.governor_id))), [teams]);
  const filteredUnassigned = useMemo(() => members.filter((member) => !assignedIds.has(member.governor_id) && member.governor_name.toLowerCase().includes(search.toLowerCase())), [members, assignedIds, search]);
  const totalAssigned = teams.reduce((sum, team) => sum + team.assignments.length, 0);
  const conflictCount = teams.reduce((sum, team) => sum + team.assignments.filter((member) => availability[member.governor_id]?.[availabilityKey(team.team_number)] === false).length, 0);
  const responseCount = Object.values(availability).filter((row) => teamNumbers.some((team) => row[availabilityKey(team)] !== null)).length;
  const allTimesSet = teams.every((team) => Boolean(team.battle_time));

  function getAvailability(member: ActivityMemberScore | Assignment, team: TeamNumber): AvailabilityValue {
    return availability[member.governor_id]?.[availabilityKey(team)] ?? null;
  }

  function setMemberAvailability(member: ActivityMemberScore | Assignment, team: TeamNumber, value: AvailabilityValue) {
    setAvailability((current) => {
      const existing = current[member.governor_id] ?? {
        governor_id: member.governor_id,
        governor_name: member.governor_name,
        team_1_available: null,
        team_2_available: null,
        team_3_available: null
      };
      return { ...current, [member.governor_id]: { ...existing, [availabilityKey(team)]: value } };
    });
  }

  function cycleAvailability(member: ActivityMemberScore | Assignment, team: TeamNumber) {
    const current = getAvailability(member, team);
    setMemberAvailability(member, team, current === null ? true : current === true ? false : null);
  }

  function assign(member: ActivityMemberScore, teamNumber = selectedTeam) {
    if (getAvailability(member, teamNumber) === false) {
      setStatus(`${member.governor_name} is marked unavailable for Team ${teamNumber}.`);
      return;
    }
    setTeams((current) => current.map((team) => team.team_number !== teamNumber ? team : team.assignments.length >= 30 ? team : { ...team, assignments: [...team.assignments, defaultAssignment(member)] }));
  }

  function remove(teamNumber: number, governorId: string) {
    setTeams((current) => current.map((team) => team.team_number === teamNumber ? { ...team, assignments: team.assignments.filter((member) => member.governor_id !== governorId) } : team));
  }

  function updateAssignment(teamNumber: number, governorId: string, patch: Partial<Assignment>) {
    setTeams((current) => current.map((team) => team.team_number === teamNumber ? { ...team, assignments: team.assignments.map((member) => member.governor_id === governorId ? { ...member, ...patch } : member) } : team));
  }

  function updateTeam(teamNumber: number, patch: Partial<TeamState>) {
    setTeams((current) => current.map((team) => team.team_number === teamNumber ? { ...team, ...patch } : team));
  }

  function autoBalance() {
    const next = teams.map((team) => ({ ...team, assignments: [] as Assignment[] }));
    const teamScore = new Map<TeamNumber, number>(teamNumbers.map((number) => [number, 0]));
    const sorted = [...members].sort((a, b) => Number(b.activity_score) - Number(a.activity_score));
    let skipped = 0;

    for (const member of sorted) {
      const explicitlyAvailable = teamNumbers.filter((team) => getAvailability(member, team) === true && next[team - 1].assignments.length < 30);
      const unknownAvailable = teamNumbers.filter((team) => getAvailability(member, team) === null && next[team - 1].assignments.length < 30);
      const eligible = explicitlyAvailable.length ? explicitlyAvailable : unknownAvailable;
      if (!eligible.length) {
        skipped += 1;
        continue;
      }
      eligible.sort((a, b) => (teamScore.get(a) ?? 0) - (teamScore.get(b) ?? 0) || next[a - 1].assignments.length - next[b - 1].assignments.length);
      const teamNumber = eligible[0];
      next[teamNumber - 1].assignments.push(defaultAssignment(member));
      teamScore.set(teamNumber, (teamScore.get(teamNumber) ?? 0) + Number(member.activity_score));
      if (next.every((team) => team.assignments.length === 30)) break;
    }

    setTeams(next);
    const assigned = next.reduce((sum, team) => sum + team.assignments.length, 0);
    setStatus(`Auto-balanced ${assigned} players across 3 teams${skipped ? ` · ${skipped} unavailable/skipped` : ""}. Review roles before saving.`);
  }

  async function persistPlan() {
    if (!arkDate || !sourceImportId) throw new Error("Set the Ark date and load a Hero Scrolls roster first.");
    const response = await fetch("/api/ark", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ark_date: arkDate, source_import_id: sourceImportId, teams, availability: Object.values(availability) })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Unable to save Ark plan.");
    setCycleId(data.cycle_id);
    setSignupToken(data.signup_token ?? null);
    setSignupOpen(Boolean(data.signup_open));
    return data;
  }

  async function save() {
    setSaving(true);
    setStatus(null);
    try {
      const data = await persistPlan();
      setStatus(`Saved ${data.assignments} assignments and ${data.availability} availability records.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save Ark plan.");
    } finally {
      setSaving(false);
    }
  }

  async function publishSignup() {
    if (!allTimesSet) {
      setStatus("Set all three Ark battle times before publishing availability.");
      return;
    }
    setPublishing(true);
    setStatus(null);
    try {
      const saved = await persistPlan();
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke("publish-ark-signup", {
        body: { cycleId: saved.cycle_id, baseUrl: window.location.origin }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSignupOpen(true);
      if (data?.signupUrl) {
        const token = String(data.signupUrl).split("/").pop() ?? null;
        if (token) setSignupToken(token);
      }
      setStatus(`Ark availability published to Discord. ${responseCount}/${members.length} responses currently recorded.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to publish Ark availability.");
    } finally {
      setPublishing(false);
    }
  }

  async function copySignupLink() {
    if (!signupToken) return;
    await navigator.clipboard.writeText(`${window.location.origin}/ark/respond/${signupToken}`);
    setStatus("Ark signup link copied.");
  }

  const activeMailTeam = teams.find((team) => team.team_number === mailTeam)!;
  const mail = useMemo(() => {
    const time = activeMailTeam.battle_time ? `${activeMailTeam.battle_time.replace("T", " ")} UTC` : "TIME TBD";
    const names = activeMailTeam.assignments.map((member) => member.governor_name).join(", ");
    return `<b><color=#6B1F1F>ARK OF OSIRIS — TEAM ${activeMailTeam.team_number}</color></b>\n\nYou are assigned to <b>TEAM ${activeMailTeam.team_number}</b>.\n\n<b>Battle Time:</b> ${time}\n<b>Check-in:</b> ${activeMailTeam.check_in_minutes} minutes before battle\n\n<b>Team Roster:</b>\n${names || "Roster not finalized."}\n\nCheck Discord before Ark for battlefield roles and instructions. If you cannot attend this time, notify leadership immediately.\n\n— ${allianceTag || "Alliance"} Leadership`;
  }, [activeMailTeam, allianceTag]);

  function availabilityButton(member: ActivityMemberScore | Assignment, team: TeamNumber) {
    const value = getAvailability(member, team);
    return <button type="button" title={`Team ${team}: ${value === true ? "available" : value === false ? "unavailable" : "unknown"}`} className={`${styles.availabilityButton} ${value === true ? styles.available : value === false ? styles.unavailable : ""}`} onClick={(event) => { event.stopPropagation(); cycleAvailability(member, team); }}>{value === true ? <Check size={12} /> : value === false ? <X size={12} /> : `T${team}`}</button>;
  }

  return (
    <div className={styles.stack}>
      <section className={styles.setupBar}>
        <div><strong>Hero Scrolls roster</strong><span>{sourceLabel ?? "No activity import available"}</span></div>
        <label>Ark date<input type="date" value={arkDate} onChange={(event) => setArkDate(event.target.value)} /></label>
        <button className="button" onClick={autoBalance} disabled={!members.length}><Shuffle size={17} /> Auto-Balance 3 Teams</button>
        <button className="button primary" onClick={save} disabled={saving || !arkDate || !sourceImportId}><Save size={17} /> {saving ? "Saving…" : "Save Ark Plan"}</button>
      </section>

      <section className={styles.summary}>
        {teams.map((team) => <div key={team.team_number}><Swords size={18} /><strong>Team {team.team_number}</strong><span>{team.assignments.length}/30</span></div>)}
        <div><Users size={18} /><strong>Assigned</strong><span>{totalAssigned}/90</span></div>
        {conflictCount > 0 && <div className={styles.conflictSummary}><AlertTriangle size={18} /><strong>Conflicts</strong><span>{conflictCount}</span></div>}
      </section>

      <section className={styles.mailCard}>
        <div className={styles.mailHeader}>
          <div><strong>Member Availability Signup</strong><span>{responseCount}/{members.length} responses · {signupOpen ? "Signup OPEN" : "Not published"}</span></div>
          <div className="row">
            <button className="button" type="button" onClick={() => window.location.reload()}><RefreshCw size={16} /> Refresh Responses</button>
            {signupToken && <button className="button" type="button" onClick={copySignupLink}><LinkIcon size={16} /> Copy Link</button>}
            <button className="button primary" type="button" onClick={publishSignup} disabled={publishing || !arkDate || !sourceImportId || !allTimesSet}>
              <Send size={16} /> {publishing ? "Publishing…" : signupOpen ? "Republish to Discord" : "Publish to Discord"}
            </button>
          </div>
        </div>
        <div className="muted" style={{ fontSize: ".82rem" }}>Publishing saves the current Ark plan first. Discord shows all three times in each member’s local timezone and links to the tokenized Conclave response form.</div>
      </section>

      <section className={styles.builder}>
        <aside className={styles.pool}>
          <div className={styles.poolHeader}><div><strong>Member Pool</strong><span>{members.length} from Hero Scrolls · click T1/T2/T3 to set availability</span></div></div>
          <div className={styles.search}><Search size={16} /><input placeholder="Search governor…" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          <div className={styles.teamPicker}>{teamNumbers.map((team) => <button key={team} className={selectedTeam === team ? styles.activePicker : ""} onClick={() => setSelectedTeam(team)}>Assign T{team}</button>)}</div>
          <div className={styles.memberList}>{filteredUnassigned.map((member) => <div key={member.governor_id} className={styles.memberRow}><button className={styles.memberIdentity} onClick={() => assign(member)}><span><strong>{member.governor_name}</strong><small>Activity #{member.rank} · {Number(member.activity_score).toFixed(1)}</small></span><span>+</span></button><div className={styles.availabilitySet}>{teamNumbers.map((team) => <span key={team}>{availabilityButton(member, team)}</span>)}</div></div>)}</div>
        </aside>

        <div className={styles.teams}>{teams.map((team) => (
          <section className={styles.teamCard} key={team.team_number}>
            <header><div><Shield size={18} /><strong>Team {team.team_number}</strong></div><span className={team.assignments.length === 30 ? styles.full : ""}>{team.assignments.length}/30</span></header>
            <div className={styles.timeRow}><label>Battle time (UTC)<input type="datetime-local" value={team.battle_time} onChange={(event) => updateTeam(team.team_number, { battle_time: event.target.value })} /></label><label>Check-in<input type="number" min="0" max="120" value={team.check_in_minutes} onChange={(event) => updateTeam(team.team_number, { check_in_minutes: Number(event.target.value) })} /></label></div>
            <div className={styles.roster}>{team.assignments.map((member) => {
              const conflict = getAvailability(member, team.team_number) === false;
              return <div className={`${styles.assignment} ${conflict ? styles.assignmentConflict : ""}`} key={member.governor_id}>
                <div className={styles.assignmentName}><strong>{member.governor_name}</strong><small>{conflict ? "UNAVAILABLE FOR THIS TIME" : `#${member.activity_rank} · ${Number(member.activity_score).toFixed(1)}`}</small></div>
                <select value={member.role} onChange={(event) => updateAssignment(team.team_number, member.governor_id, { role: event.target.value as ArkRole })}>{(["captain","rally","garrison","field","ark_runner","flex"] as ArkRole[]).map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</select>
                <select value={member.battlefield_group} onChange={(event) => updateAssignment(team.team_number, member.governor_id, { battlefield_group: event.target.value as ArkGroup })}><option value="flex">Flex</option><option value="top">Top</option><option value="bottom">Bottom</option><option value="center">Center/Ark</option></select>
                <button title="Toggle confirmed" className={member.confirmed ? styles.confirmed : ""} onClick={() => updateAssignment(team.team_number, member.governor_id, { confirmed: !member.confirmed })}><Check size={15} /></button>
                <button title="Remove" onClick={() => remove(team.team_number, member.governor_id)}>×</button>
              </div>;
            })}</div>
          </section>
        ))}</div>
      </section>

      <section className={styles.mailCard}>
        <div className={styles.mailHeader}><div><strong>Rise of Kingdoms Team Mail</strong><span>Dark, high-contrast fancy-mail markup</span></div><div className={styles.teamPicker}>{teamNumbers.map((team) => <button key={team} className={mailTeam === team ? styles.activePicker : ""} onClick={() => setMailTeam(team)}>Team {team}</button>)}</div></div>
        <textarea readOnly value={mail} rows={10} />
        <button className="button" onClick={async () => { await navigator.clipboard.writeText(mail); setStatus(`Team ${mailTeam} mail copied.`); }}><Clipboard size={17} /> Copy Team {mailTeam} Mail</button>
      </section>

      {status && <div className={styles.status}>{status}</div>}
    </div>
  );
}
