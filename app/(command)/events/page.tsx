import Link from "next/link";
import { FileUp, Plus } from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentMembership, getEvents } from "@/lib/data";
import { formatUtc } from "@/lib/utils";

export default async function EventsPage() {
  const [events, membership] = await Promise.all([getEvents(), getCurrentMembership()]);

  return (
    <>
      <DemoBanner />
      <div className="page-header">
        <div>
          <h1>Events</h1>
          <p className="muted">Every kingdom and alliance event in one operational list.</p>
        </div>
        {membership?.role === "event_director" && <div className="actions">
          <Link className="button" href="/events/import"><FileUp size={17} /> Import calendar</Link>
          <Link className="button primary" href="/events/new"><Plus size={17} /> Create event</Link>
        </div>}
      </div>

      <div className="card">
        <div className="card-header">
          <strong>{events.length} events</strong>
          <small>Sorted by start date</small>
        </div>
        <div>
          {events.map(event => (
            <Link className="event-row" href={`/events/${event.id}`} key={event.id}>
              <div>
                <div className="event-name">{event.name}</div>
                <div className="event-meta">{event.category} · {event.scope}</div>
              </div>
              <div>
                <div>{formatUtc(event.start_at)}</div>
                <div className="event-meta">{event.alliance_name ?? "Kingdom 4126"}</div>
              </div>
              <StatusBadge value={event.certainty} />
              <StatusBadge value={event.status} />
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
