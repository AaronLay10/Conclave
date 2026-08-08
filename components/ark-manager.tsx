"use client";

import { useMemo, useState } from "react";
import { Check, Clipboard, Save, Search, Shield, Swords, Users } from "lucide-react";
import type { ActivityMemberScore } from "@/lib/types";
import styles from "./ark-manager.module.css";

type ArkRole = "captain" | "rally" | "garrison" | "field" | "ark_runner" | "flex";
type ArkGroup = "top" | "bottom" | "center" | "flex";

type Assignment = {
  governor_id: string;
  governor_name: string;
  activity_rank: number;
  activity_score: number;
  role: ArkRole;
  battlefield_group: ArkGroup;
  confirmed: boolean;
};

type TeamState = {
  team_number: 1 | 2 | 3;
  battle_time: string;
  check_in_minutes: number;
  assignments: Assignment[];
};

type SavedPlan = {
  ark_date?: string;
  title?: string;
  status?: string;
  ark_teams?: Array<{
    team_number: 1 | 2 | 3;
    battle_time: string | null;
    check_in_minutes: number;
    ark_assignments?: Assignment[];
  }>;
} | null;

const emptyTeams = (): TeamState[] => ([1, 2, 3] as const).map((team_number) => ({
  team_number,
  battle_time: "",
  check_in_minutes: 30,
  assignments: []
}));

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

export function ArkManager({
  allianceTag,
  sourceImportId,
  sourceLabel,
  members,
  savedPlan
}: {
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
      assignments: (saved.ark_assignments ?? []).map((assignment) => ({
        ...assignment,
        activity_rank: Number(assignment.activity_rank ?? 0),
        activity_score: Number(assignment.activity_score ?? 0)
      }))
    } : team;
  });

  const [arkDate, setArkDate] = useState(plan?.ark_date ?? "");
  const [teams, setTeams] = useState<TeamState[]>(restoredTeams);
  const [search, setSearch] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<1 | 2 | 3>(1);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mailTeam, setMailTeam] = useState<1 | 2 | 3>(1);

  const assignedIds = useMemo(() => new Set(teams.flatMap((team) => team.assignments.map((member) => member.governor_id))), [teams]);
  const availableMembers = useMemo(() => members.filter((member) => !assignedIds.has(member.governor_id) && member.governor_name.toLowerCase().includes(search.toLowerCase())), [members, assignedIds, search]);

  function assign(member: ActivityMemberScore, teamNumber = selectedTeam) {
    setTeams((current) => current.map((team) => team.team_number !== teamNumber ? team : team.assignments.length >= 30 ? team : {
      ...team,
      assignments: [...team.assignments, {
        governor_id: member.governor_id,
        governor_name: member.governor_name,
        activity_rank: member.rank,
        activity_score: member.activity_score,
        role: "field",
        battlefield_group: "flex",
        confirmed: false
      }]
    }));
  }

  function remove(teamNumber: number, governorId: string) {
    setTeams((current) => current.map((team) => team.team_number === teamNumber ? { ...team, assignments: team.assignments.filter((member) => member.governor_id !== governorId) } : team));
  }

  function updateAssignment(teamNumber: number, governorId: string, patch: Partial<Assignment>) {
    setTeams((current) => current.map((team) => team.team_number === teamNumber ? {
      ...team,
      assignments: team.assignments.map((member) => member.governor_id === governorId ? { ...member, ...patch } : member)
    } : team));
  }

  function updateTeam(teamNumber: number, patch: Partial<TeamState>) {
    setTeams((current) => current.map((team) => team.team_number === teamNumber ? { ...team, ...patch } : team));
  }

  async function save() {
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch("/api/ark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ark_date: arkDate, source_import_id: sourceImportId, teams })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to save Ark plan.");
      setStatus(`Saved ${data.assignments} assignments.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save Ark plan.");
    } finally {
      setSaving(false);
    }
  }

  const activeMailTeam = teams.find((team) => team.team_number === mailTeam)!;
  const mail = useMemo(() => {
    const time = activeMailTeam.battle_time ? `${activeMailTeam.battle_time.replace("T", " ")} UTC` : "TIME TBD";
    const names = activeMailTeam.assignments.map((member) => member.governor_name).join(", ");
    return `<b><color=#6B1F1F>ARK OF OSIRIS — TEAM ${activeMailTeam.team_number}</color></b>\n\nYou are assigned to <b>TEAM ${activeMailTeam.team_number}</b>.\n\n<b>Battle Time:</b> ${time}\n<b>Check-in:</b> ${activeMailTeam.check_in_minutes} minutes before battle\n\n<b>Team Roster:</b>\n${names || "Roster not finalized."}\n\nCheck Discord before Ark for battlefield roles and instructions. If you cannot attend this time, notify leadership immediately.\n\n— ${allianceTag || "Alliance"} Leadership`;
  }, [activeMailTeam, allianceTag]);

  return (
    <div className={styles.stack}>
      <section className={styles.setupBar}>
        <div><strong>Hero Scrolls roster</strong><span>{sourceLabel ?? "No activity import available"}</span></div>
        <label>Ark date<input type="date" value={arkDate} onChange={(event) => setArkDate(event.target.value)} /></label>
        <button className="button primary" onClick={save} disabled={saving || !arkDate || !sourceImportId}><Save size={17} /> {saving ? "Saving…" : "Save Ark Plan"}</button>
      </section>

      <section className={styles.summary}>
        {teams.map((team) => <div key={team.team_number}><Swords size={18} /><strong>Team {team.team_number}</strong><span>{team.assignments.length}/30</span></div>)}
        <div><Users size={18} /><strong>Unassigned</strong><span>{availableMembers.length}</span></div>
      </section>

      <section className={styles.builder}>
        <aside className={styles.pool}>
          <div className={styles.poolHeader}><div><strong>Member Pool</strong><span>{members.length} from Hero Scrolls</span></div></div>
          <div className={styles.search}><Search size={16} /><input placeholder="Search governor…" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          <div className={styles.teamPicker}>{([1,2,3] as const).map((team) => <button key={team} className={selectedTeam === team ? styles.activePicker : ""} onClick={() => setSelectedTeam(team)}>Team {team}</button>)}</div>
          <div className={styles.memberList}>{availableMembers.map((member) => <button key={member.governor_id} className={styles.memberRow} onClick={() => assign(member)}><span><strong>{member.governor_name}</strong><small>Activity #{member.rank} · {Number(member.activity_score).toFixed(1)}</small></span><span>+</span></button>)}</div>
        </aside>

        <div className={styles.teams}>{teams.map((team) => (
          <section className={styles.teamCard} key={team.team_number}>
            <header><div><Shield size={18} /><strong>Team {team.team_number}</strong></div><span className={team.assignments.length === 30 ? styles.full : ""}>{team.assignments.length}/30</span></header>
            <div className={styles.timeRow}><label>Battle time (UTC)<input type="datetime-local" value={team.battle_time} onChange={(event) => updateTeam(team.team_number, { battle_time: event.target.value })} /></label><label>Check-in<input type="number" min="0" max="120" value={team.check_in_minutes} onChange={(event) => updateTeam(team.team_number, { check_in_minutes: Number(event.target.value) })} /></label></div>
            <div className={styles.roster}>{team.assignments.map((member) => (
              <div className={styles.assignment} key={member.governor_id}>
                <div className={styles.assignmentName}><strong>{member.governor_name}</strong><small>#{member.activity_rank} · {Number(member.activity_score).toFixed(1)}</small></div>
                <select value={member.role} onChange={(event) => updateAssignment(team.team_number, member.governor_id, { role: event.target.value as ArkRole })}>{(["captain","rally","garrison","field","ark_runner","flex"] as ArkRole[]).map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</select>
                <select value={member.battlefield_group} onChange={(event) => updateAssignment(team.team_number, member.governor_id, { battlefield_group: event.target.value as ArkGroup })}><option value="flex">Flex</option><option value="top">Top</option><option value="bottom">Bottom</option><option value="center">Center/Ark</option></select>
                <button title="Toggle confirmed" className={member.confirmed ? styles.confirmed : ""} onClick={() => updateAssignment(team.team_number, member.governor_id, { confirmed: !member.confirmed })}><Check size={15} /></button>
                <button title="Remove" onClick={() => remove(team.team_number, member.governor_id)}>×</button>
              </div>
            ))}</div>
          </section>
        ))}</div>
      </section>

      <section className={styles.mailCard}>
        <div className={styles.mailHeader}><div><strong>Rise of Kingdoms Team Mail</strong><span>Dark, high-contrast fancy-mail markup</span></div><div className={styles.teamPicker}>{([1,2,3] as const).map((team) => <button key={team} className={mailTeam === team ? styles.activePicker : ""} onClick={() => setMailTeam(team)}>Team {team}</button>)}</div></div>
        <textarea readOnly value={mail} rows={10} />
        <button className="button" onClick={async () => { await navigator.clipboard.writeText(mail); setStatus(`Team ${mailTeam} mail copied.`); }}><Clipboard size={17} /> Copy Team {mailTeam} Mail</button>
      </section>

      {status && <div className={styles.status}>{status}</div>}
    </div>
  );
}
