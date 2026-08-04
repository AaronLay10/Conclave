import Link from "next/link";
import { CalendarSearch, Plus } from "lucide-react";
import { CalendarGrid } from "@/components/calendar-grid";
import { DemoBanner } from "@/components/demo-banner";
import { getEvents } from "@/lib/data";

export default async function CalendarPage() {
  const events = await getEvents();

  return (
    <>
      <DemoBanner />
      <div className="page-header">
        <div>
          <h1>Kingdom Calendar</h1>
          <p className="muted">Month view of kingdom and alliance event start times.</p>
        </div>
        <div className="actions">
          <Link className="button" href="/predictions"><CalendarSearch size={17} /> Review predictions</Link>
          <Link className="button primary" href="/events/new"><Plus size={17} /> Create event</Link>
        </div>
      </div>
      <div className="calendar-legend" aria-label="Event certainty legend">
        <span><i className="certainty-dot confirmed" /> Confirmed</span>
        <span><i className="certainty-dot predicted" /> Predicted</span>
        <span><i className="certainty-dot leadership_scheduled" /> Leadership scheduled</span>
        <span><i className="certainty-dot tbd" /> TBD</span>
      </div>
      <CalendarGrid events={events} />
    </>
  );
}
