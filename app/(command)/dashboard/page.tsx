import Link from "next/link";
import { AlertTriangle, ArrowRight, Plus } from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { EventCard } from "@/components/event-card";
import { StatCard } from "@/components/stat-card";
import { AllianceCommandCenter } from "@/components/alliance-command-center";
import { getCurrentMembership, getEvents, getLatestActivitySnapshot } from "@/lib/data";
import { isAllianceLeadershipRole } from "@/lib/access-control";
import { eventIsActive, eventIsUpcoming, timeUntil } from "@/lib/utils";

export default async function DashboardPage() {
  const [events, membership] = await Promise.all([getEvents(), getCurrentMembership()]);
  if (membership && isAllianceLeadershipRole(membership.role)) {
    const activity = await getLatestActivitySnapshot();
    return (
      <>
        <DemoBanner />
        <AllianceCommandCenter
          allianceName={membership.alliance_name ?? activity?.alliance_name ?? "Alliance"}
          allianceTag={membership.alliance_tag ?? activity?.alliance_tag ?? "—"}
          role={membership.role}
          events={events}
          activity={activity}
        />
      </>
    );
  }
  const now = new Date();
  const active = events.filter((event) => eventIsActive(event, now));
  const upcoming = events.filter((event) => eventIsUpcoming(event, now));
  const needsAction = events.filter((event) =>
    ["draft", "review"].includes(event.status)
  );
  const nextSevenDays = upcoming.filter(
    (event) =>
      new Date(event.start_at).getTime() <=
      now.getTime() + 7 * 24 * 60 * 60 * 1000
  );

  return (
    <>
      <DemoBanner />
      <div className="page-header">
        <div>
          <h1>Events Command Center</h1>
          <p className="muted">
            Plan, approve, publish, coordinate, and record kingdom events.
          </p>
        </div>
        <div className="actions">
          <Link className="button" href="/calendar">Open calendar</Link>
          {membership?.role === "event_director" && <Link className="button primary" href="/events/new"><Plus size={17} /> Create event</Link>}
        </div>
      </div>

      <div className="grid cols-4">
        <StatCard label="Active now" value={active.length} meta="Events currently in progress" />
        <StatCard label="Next 7 days" value={nextSevenDays.length} meta="Confirmed and planned windows" />
        <StatCard label="Needs action" value={needsAction.length} meta="Drafts and leadership review" />
        <StatCard label="Published" value={events.filter(e => e.status === "published").length} meta="Member-facing events" />
      </div>

      <section className="section grid cols-2">
        <div className="card">
          <div className="card-header">
            <h2 style={{ margin: 0 }}>Happening now</h2>
            <span className="badge active">{active.length} active</span>
          </div>
          <div className="card-body stack">
            {active.length ? active.map(event => <EventCard event={event} key={event.id} />) : (
              <div className="empty">No event is active at this moment.</div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 style={{ margin: 0 }}>Leadership action</h2>
            <AlertTriangle size={18} color="var(--gold)" />
          </div>
          <div>
            {needsAction.slice(0, 5).map(event => (
              <Link className="event-row" href={`/events/${event.id}`} key={event.id}>
                <div>
                  <div className="event-name">{event.name}</div>
                  <div className="event-meta">{event.status === "review" ? "Awaiting approval" : "Event details incomplete"}</div>
                </div>
                <span>{event.certainty.replaceAll("_", " ")}</span>
                <span>{timeUntil(event.start_at)}</span>
                <ArrowRight size={17} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="page-header" style={{ marginBottom: 12 }}>
          <div>
            <h2 style={{ marginBottom: 3 }}>Coming next</h2>
            <small>Upcoming kingdom and alliance events</small>
          </div>
          <Link href="/events" className="button">View all <ArrowRight size={16} /></Link>
        </div>
        <div className="grid cols-3">
          {upcoming.slice(0, 6).map(event => <EventCard key={event.id} event={event} />)}
        </div>
      </section>
    </>
  );
}
