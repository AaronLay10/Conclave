import Link from "next/link";
import { Plus } from "lucide-react";
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
        <Link className="button primary" href="/events/new"><Plus size={17} /> Create event</Link>
      </div>
      <CalendarGrid events={events} />
    </>
  );
}
