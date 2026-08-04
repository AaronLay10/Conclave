"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, FileSpreadsheet, Search } from "lucide-react";
import type { ActivityMemberScore, ActivitySnapshot, ActivityTier } from "@/lib/types";

const tiers: ActivityTier[] = ["Exceptional", "Strong", "Active", "Light", "At Risk"];
type SortKey = "rank" | "governor_name" | "activity_score" | "tech_donations" | "helps_given" | "fort_points_per_week" | "building_points" | "resource_assistance";
type AttentionFilter = "All" | "Needs attention" | "No recorded activity";

const sortLabels: Record<SortKey, string> = {
  rank: "Rank",
  governor_name: "Governor name",
  activity_score: "Activity score",
  tech_donations: "Tech donations",
  helps_given: "Helps given",
  fort_points_per_week: "Fort points / week",
  building_points: "Building points",
  resource_assistance: "Resource assistance"
};

function formatted(value: number, digits = 0) {
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function shortDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function utcDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC"
  })} UTC`;
}

export function ActivityCenter({ initialSnapshot }: { initialSnapshot: ActivitySnapshot | null }) {
  const [query, setQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<"All" | ActivityTier>("All");
  const [attentionFilter, setAttentionFilter] = useState<AttentionFilter>("All");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const members = useMemo(() => initialSnapshot?.members ?? [], [initialSnapshot?.members]);
  const filteredMembers = useMemo(() => members
    .filter((member) => {
      const matchesQuery = `${member.governor_name} ${member.governor_id}`.toLowerCase().includes(query.toLowerCase().trim());
      const matchesTier = tierFilter === "All" || member.tier === tierFilter;
      const matchesAttention = attentionFilter === "All"
        || (attentionFilter === "Needs attention" && ["Light", "At Risk"].includes(member.tier))
        || (attentionFilter === "No recorded activity" && Boolean(member.data_note));
      return matchesQuery && matchesTier && matchesAttention;
    })
    .sort((left, right) => {
      const leftValue = left[sortKey];
      const rightValue = right[sortKey];
      const comparison = typeof leftValue === "string"
        ? leftValue.localeCompare(String(rightValue), undefined, { sensitivity: "base" })
        : Number(leftValue) - Number(rightValue);
      return sortDirection === "asc" ? comparison : -comparison;
    }), [attentionFilter, members, query, sortDirection, sortKey, tierFilter]);

  return (
    <section className="card activity-member-report">
      <div className="card-header activity-table-header">
        <div>
          <strong>Alliance members</strong>
          <small>{initialSnapshot ? `${initialSnapshot.alliance_name} [${initialSnapshot.alliance_tag}] · ${shortDate(initialSnapshot.activity_period_start)}–${shortDate(initialSnapshot.activity_period_end)}` : "No activity snapshot is available yet."}</small>
          {initialSnapshot && <small className="activity-last-updated">Last table update: {utcDateTime(initialSnapshot.created_at)}</small>}
        </div>
        <div className="activity-filters">
          <label className="search-field"><Search size={18} /><input aria-label="Search members" placeholder="Search name or ID" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <select aria-label="Filter activity tier" value={tierFilter} onChange={(event) => setTierFilter(event.target.value as "All" | ActivityTier)}>
            <option value="All">All tiers</option>
            {tiers.map((tier) => <option key={tier}>{tier}</option>)}
          </select>
          <select aria-label="Filter members needing attention" value={attentionFilter} onChange={(event) => setAttentionFilter(event.target.value as AttentionFilter)}>
            <option value="All">All activity levels</option>
            <option value="Needs attention">Needs attention</option>
            <option value="No recorded activity">No recorded activity</option>
          </select>
          <select aria-label="Sort activity members" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
            {Object.entries(sortLabels).map(([value, label]) => <option key={value} value={value}>Sort: {label}</option>)}
          </select>
          <button className="icon-button" aria-label={`Sort ${sortDirection === "asc" ? "descending" : "ascending"}`} title={`Currently ${sortDirection === "asc" ? "ascending" : "descending"}`} onClick={() => setSortDirection((direction) => direction === "asc" ? "desc" : "asc")}>
            {sortDirection === "asc" ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
          </button>
        </div>
      </div>

      {members.length === 0 ? (
        <div className="empty"><FileSpreadsheet size={34} /><p>No activity snapshot is available for your alliance yet.</p></div>
      ) : (
        <div>
          <div className="activity-filter-summary">Showing {filteredMembers.length} of {members.length} members</div>
          <div className="mobile-activity-columns" aria-hidden="true"><span>Name</span><span>Score</span><span>Tier</span></div>
          <div className="activity-table-wrap">
            <table className="activity-table">
              <thead><tr><th>Rank</th><th>Governor</th><th>Score</th><th>Tier</th><th>Tech</th><th>Helps</th><th>Fort / wk</th><th>Building</th><th>Resources</th><th>Note</th></tr></thead>
              <tbody>
                {filteredMembers.length === 0 ? (
                  <tr className="activity-empty-row"><td colSpan={10}><div className="empty">No members match these filters.</div></td></tr>
                ) : filteredMembers.map((member: ActivityMemberScore) => (
                  <tr key={member.governor_id}>
                    <td data-label="Rank" className="rank-cell">#{member.rank}</td>
                    <td data-label="Governor"><strong>{member.governor_name}</strong><small>{member.governor_id}</small></td>
                    <td data-label="Score" className="score-cell"><strong>{member.activity_score.toFixed(1)}</strong><span><i style={{ width: `${Math.min(member.activity_score, 100)}%` }} /></span></td>
                    <td data-label="Tier"><span className={`activity-tier tier-${member.tier.toLowerCase().replace(" ", "-")}`}>{member.tier}</span></td>
                    <td data-label="Tech">{formatted(member.tech_donations)}</td>
                    <td data-label="Helps">{formatted(member.helps_given)}</td>
                    <td data-label="Fort / week">{formatted(member.fort_points_per_week)}</td>
                    <td data-label="Building">{formatted(member.building_points)}</td>
                    <td data-label="Resources">{formatted(member.resource_assistance)}</td>
                    <td data-label="Note"><small>{member.data_note ?? "—"}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style jsx global>{`
        .mobile-activity-columns { display: none; }

        @media (max-width: 760px) {
          .activity-member-report > .card-header {
            padding: 18px 16px;
          }

          .activity-member-report > .card-header strong {
            font-size: 1.1rem;
          }

          .activity-member-report > .card-header small {
            display: block;
            margin-top: 5px;
            font-size: .82rem;
            line-height: 1.35;
          }

          .activity-member-report .activity-filters {
            gap: 10px;
          }

          .activity-member-report .search-field,
          .activity-member-report .activity-filters select {
            min-height: 48px;
            font-size: 16px;
          }

          .activity-member-report .search-field input {
            min-height: 44px;
            padding: 12px 10px;
            font-size: 16px;
          }

          .activity-member-report .activity-filters .icon-button {
            width: 48px;
            height: 48px;
          }

          .activity-filter-summary {
            padding: 12px 14px;
            font-size: .92rem;
          }

          .mobile-activity-columns {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 64px minmax(96px, auto);
            gap: 12px;
            padding: 14px 14px 7px;
            color: var(--muted);
            font-size: .78rem;
            font-weight: 800;
            letter-spacing: .045em;
            text-transform: uppercase;
          }

          .mobile-activity-columns span:nth-child(2),
          .mobile-activity-columns span:nth-child(3) { text-align: right; }

          .activity-member-report .activity-table tbody {
            gap: 8px;
            margin-top: 5px;
          }

          .activity-member-report .activity-table tr:not(.activity-empty-row) {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 64px minmax(96px, auto);
            align-items: center;
            gap: 12px;
            min-height: 56px;
            padding: 13px 14px;
          }

          .activity-member-report .activity-table tr:not(.activity-empty-row) td {
            display: none;
            min-width: 0;
            padding: 0;
            border: 0;
          }

          .activity-member-report .activity-table tr:not(.activity-empty-row) td:nth-child(2),
          .activity-member-report .activity-table tr:not(.activity-empty-row) td:nth-child(3),
          .activity-member-report .activity-table tr:not(.activity-empty-row) td:nth-child(4) {
            display: flex;
          }

          .activity-member-report .activity-table tr:not(.activity-empty-row) td::before { content: none; }

          .activity-member-report .activity-table tr:not(.activity-empty-row) td:nth-child(2) {
            align-items: flex-start;
            justify-content: center;
            flex-direction: column;
            text-align: left;
          }

          .activity-member-report .activity-table tr:not(.activity-empty-row) td:nth-child(2) strong {
            overflow: hidden;
            max-width: 100%;
            font-size: 1rem;
            line-height: 1.25;
            text-overflow: ellipsis;
            white-space: nowrap;
            text-align: left;
          }

          .activity-member-report .activity-table tr:not(.activity-empty-row) td:nth-child(2) small { display: none; }

          .activity-member-report .activity-table tr:not(.activity-empty-row) td:nth-child(3),
          .activity-member-report .activity-table tr:not(.activity-empty-row) td:nth-child(4) {
            justify-content: flex-end;
            text-align: right;
          }

          .activity-member-report .activity-table .score-cell strong {
            font-size: 1rem;
            line-height: 1;
          }

          .activity-member-report .activity-table .activity-tier {
            padding: 5px 8px;
            font-size: .72rem;
            white-space: nowrap;
          }
        }
      `}</style>
    </section>
  );
}
