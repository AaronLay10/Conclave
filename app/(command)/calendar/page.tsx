import Link from "next/link";
import { Plus } from "lucide-react";
import { CalendarGrid } from "@/components/calendar-grid";
import { DemoBanner } from "@/components/demo-banner";
import { getCurrentMembership, getEvents } from "@/lib/data";

export default async function CalendarPage() {
  const [events, membership] = await Promise.all([
    getEvents(),
    getCurrentMembership()
  ]);

  return (
    <>
      <DemoBanner />
      <div className="page-header">
        <div>
          <h1>Kingdom Calendar</h1>
          <p className="muted">Verified events, confidence-rated predictions, and inline approval in one calendar.</p>
        </div>
        <div className="actions">
          <Link className="button primary" href="/events/new"><Plus size={17} /> Create event</Link>
        </div>
      </div>
      <CalendarGrid
        events={events}
        canManagePredictions={membership?.role === "event_director"}
      />
    </>
  );
}
