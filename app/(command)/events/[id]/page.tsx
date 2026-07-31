import Link from "next/link";
import { ArrowLeft, BellRing, CalendarClock, Pencil, Shield, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { DeleteEventButton } from "@/components/delete-event-button";
import { LocalDateTime } from "@/components/local-date-time";
import { StatusBadge } from "@/components/status-badge";
import { getEvent } from "@/lib/data";
import { formatUtc } from "@/lib/utils";

export default async function EventDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();

  return (
    <>
      <div className="page-header">
        <div>
          <Link href="/events" className="row muted" style={{ marginBottom: 10 }}><ArrowLeft size={15} /> All events</Link>
          <h1>{event.name}</h1>
          <div className="row">
            <StatusBadge value={event.certainty} />
            <StatusBadge value={event.status} />
          </div>
        </div>
        <div className="actions">
          <Link className="button" href={`/events/${event.id}/edit`}><Pencil size={16} /> Edit event</Link>
          <Link className="button" href={`/announcements?event=${event.id}`}><BellRing size={16} /> Generate announcement</Link>
          <DeleteEventButton eventId={event.id} eventName={event.name} />
        </div>
      </div>

      <div className="grid cols-3">
        <div className="card stat-card">
          <div className="row"><CalendarClock size={18} color="var(--gold)" /><strong>Starts</strong></div>
          <div style={{ marginTop: 12 }}>{formatUtc(event.start_at)}</div>
          <small><LocalDateTime value={event.start_at} /> local</small>
        </div>
        <div className="card stat-card">
          <div className="row"><Shield size={18} color="var(--blue)" /><strong>Scope</strong></div>
          <div style={{ marginTop: 12 }}>{event.scope === "kingdom" ? "Kingdom 4126" : event.alliance_name ?? "Alliance"}</div>
          <small>{event.category}</small>
        </div>
        <div className="card stat-card">
          <div className="row"><UserRound size={18} color="var(--green)" /><strong>Owner</strong></div>
          <div style={{ marginTop: 12 }}>{event.owner_name ?? "Not assigned"}</div>
          <small>Operational responsibility</small>
        </div>
      </div>

      <section className="section grid cols-2">
        <div className="card">
          <div className="card-header"><h2 style={{ margin: 0 }}>Overview</h2></div>
          <div className="card-body">
            <p>{event.description ?? "No description has been added."}</p>
            <dl className="detail-list">
              <dt>Start</dt><dd>{formatUtc(event.start_at)}</dd>
              <dt>End</dt><dd>{formatUtc(event.end_at)}</dd>
              <dt>Certainty</dt><dd>{event.certainty.replaceAll("_", " ")}</dd>
              <dt>Workflow</dt><dd>{event.status}</dd>
              <dt>Location</dt><dd>{event.location ?? "Rise of Kingdoms"}</dd>
            </dl>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h2 style={{ margin: 0 }}>Leadership checklist</h2></div>
          <div className="card-body checklist">
            {[
              ["Event date verified in-game", event.certainty === "confirmed"],
              ["Rules approved", ["approved","published","active","completed"].includes(event.status)],
              ["Event owner assigned", Boolean(event.owner_name || event.owner_id)],
              ["Member announcement published", ["published","active","completed"].includes(event.status)]
            ].map(([label, complete]) => (
              <div className="check" key={String(label)}>
                <span className={`status-dot ${complete ? "ok" : "warn"}`} />
                <div>
                  <strong>{String(label)}</strong>
                  <div className="muted" style={{ fontSize: ".78rem" }}>{complete ? "Complete" : "Action required"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section grid cols-2">
        <div className="card">
          <div className="card-header"><h2 style={{ margin: 0 }}>Member preparation</h2></div>
          <div className="card-body"><p>{event.preparation ?? "No preparation instructions have been added."}</p></div>
        </div>
        <div className="card">
          <div className="card-header"><h2 style={{ margin: 0 }}>Rules and instructions</h2></div>
          <div className="card-body"><p>{event.rules ?? "No rules have been added."}</p></div>
        </div>
      </section>
    </>
  );
}
