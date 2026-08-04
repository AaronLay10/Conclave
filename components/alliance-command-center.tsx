import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CalendarDays,
  ChartNoAxesCombined,
  ListChecks,
  Shield,
  Sparkles,
  Users
} from "lucide-react";
import { EventCard } from "@/components/event-card";
import { StatCard } from "@/components/stat-card";
import { roleLabels, type AppRole } from "@/lib/access-control";
import type { ActivitySnapshot, ActivityTier, RokEvent } from "@/lib/types";
import { eventIsActive, eventIsUpcoming, timeUntil } from "@/lib/utils";

type AllianceCommandCenterProps = {
  allianceName: string;
  allianceTag: string;
  role: AppRole;
  events: RokEvent[];
  activity: ActivitySnapshot | null;
};

const tierOrder: ActivityTier[] = ["Exceptional", "Strong", "Active", "Light", "At Risk"];

function shortDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

export function AllianceCommandCenter({ allianceName, allianceTag, role, events, activity }: AllianceCommandCenterProps) {
  const now = new Date();
  const active = events.filter((event) => eventIsActive(event, now));
  const upcoming = events.filter((event) => eventIsUpcoming(event, now));
  const nextSevenDays = upcoming.filter((event) =>
    new Date(event.start_at).getTime() <= now.getTime() + 7 * 24 * 60 * 60 * 1000
  );
  const members = activity?.members ?? [];
  const averageScore = members.length
    ? members.reduce((sum, member) => sum + member.activity_score, 0) / members.length
    : 0;
  const needsAttention = members.filter((member) => member.tier === "Light" || member.tier === "At Risk");
  const tierCounts = tierOrder.map((tier) => ({
    tier,
    count: members.filter((member) => member.tier === tier).length
  }));
  const nextEvent = upcoming[0];

  return (
    <>
      <section className="card alliance-dashboard-hero">
        <div>
          <div className="row alliance-eyebrow"><Shield size={16} /> {roleLabels[role]}</div>
          <h1>{allianceName} <span>[{allianceTag}]</span></h1>
          <p>Alliance operations, activity health, and upcoming events in one place.</p>
        </div>
        <div className="actions">
          <Link className="button" href="/calendar"><CalendarDays size={17} /> Open calendar</Link>
          <Link className="button primary" href="/activity"><ChartNoAxesCombined size={17} /> Alliance activity</Link>
        </div>
      </section>

      <div className="grid cols-4">
        <StatCard label="Active now" value={active.length} meta="Events currently underway" />
        <StatCard label="Next 7 days" value={nextSevenDays.length} meta="Alliance and kingdom events" />
        <StatCard label="Activity average" value={activity ? averageScore.toFixed(1) : "—"} meta={activity ? `${members.length} members scored` : "No report available"} />
        <StatCard label="Needs attention" value={activity ? needsAttention.length : "—"} meta="Light or at-risk activity" />
      </div>

      <section className="section alliance-quick-grid">
        <Link href="/calendar" className="card alliance-quick-card">
          <CalendarDays size={22} />
          <div><strong>Alliance calendar</strong><span>{nextEvent ? `${nextEvent.name} · ${timeUntil(nextEvent.start_at)}` : "No upcoming events"}</span></div>
          <ArrowRight size={17} />
        </Link>
        <Link href="/activity" className="card alliance-quick-card">
          <ChartNoAxesCombined size={22} />
          <div><strong>Activity dashboard</strong><span>{activity ? `${shortDate(activity.activity_period_start)}–${shortDate(activity.activity_period_end)} report` : "Waiting for the first report"}</span></div>
          <ArrowRight size={17} />
        </Link>
        <Link href="/events" className="card alliance-quick-card">
          <ListChecks size={22} />
          <div><strong>Event details</strong><span>{upcoming.length} upcoming events visible</span></div>
          <ArrowRight size={17} />
        </Link>
        <Link href="/announcements" className="card alliance-quick-card">
          <BellRing size={22} />
          <div><strong>Announcements</strong><span>Create coordinated alliance messages</span></div>
          <ArrowRight size={17} />
        </Link>
      </section>

      <section className="section grid alliance-dashboard-grid">
        <div className="card">
          <div className="card-header">
            <div className="row"><ChartNoAxesCombined size={18} /><strong>Activity pulse</strong></div>
            <Link href="/activity" className="button">View members <ArrowRight size={16} /></Link>
          </div>
          {activity ? (
            <div className="card-body stack">
              <div className="activity-period-summary">
                <div><span>Latest report</span><strong>{shortDate(activity.activity_period_start)}–{shortDate(activity.activity_period_end)}</strong></div>
                <div><span>Roster</span><strong>{members.length} members</strong></div>
              </div>
              <div className="tier-pulse-list">
                {tierCounts.map(({ tier, count }) => (
                  <div key={tier}>
                    <span>{tier}</span>
                    <div><i style={{ width: `${members.length ? (count / members.length) * 100 : 0}%` }} /></div>
                    <strong>{count}</strong>
                  </div>
                ))}
              </div>
              {needsAttention.length > 0 && (
                <div className="alliance-attention-note">
                  <AlertTriangle size={17} />
                  <span><strong>{needsAttention.length} members need review.</strong> Use the Activity dashboard to filter and sort the roster.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="empty"><Users size={30} /><p>No activity snapshot is available for this alliance yet.</p></div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div className="row"><Sparkles size={18} /><strong>Happening now</strong></div>
            <span className="badge active">{active.length} active</span>
          </div>
          <div className="card-body stack">
            {active.length ? active.slice(0, 3).map((event) => <EventCard event={event} key={event.id} />) : (
              <div className="empty">No event is active right now.</div>
            )}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="page-header" style={{ marginBottom: 12 }}>
          <div><h2 style={{ marginBottom: 3 }}>Coming next</h2><small>Upcoming alliance and kingdom events</small></div>
          <Link href="/calendar" className="button">Full calendar <ArrowRight size={16} /></Link>
        </div>
        {upcoming.length ? (
          <div className="grid cols-3">{upcoming.slice(0, 6).map((event) => <EventCard key={event.id} event={event} />)}</div>
        ) : (
          <div className="card empty">No upcoming events are scheduled.</div>
        )}
      </section>
    </>
  );
}
