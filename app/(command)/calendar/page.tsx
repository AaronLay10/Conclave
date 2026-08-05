import Link from "next/link";
import { Plus } from "lucide-react";
import { CalendarGrid } from "@/components/calendar-grid";
import { DemoBanner } from "@/components/demo-banner";
import { getCurrentMembership, getEvents } from "@/lib/data";
import styles from "./calendar-page.module.css";

export default async function CalendarPage() {
  const [events, membership] = await Promise.all([
    getEvents(),
    getCurrentMembership()
  ]);

  return (
    <div className={styles.page}>
      <DemoBanner />
      <div className={`page-header ${styles.header}`}>
        <div>
          <h1>Kingdom Calendar</h1>
          <p className="muted">Click an event to approve predictions, edit the schedule, or view full details.</p>
        </div>
        <div className="actions">
          <Link className="button primary" href="/events/new"><Plus size={17} /> Create event</Link>
        </div>
      </div>
      <div className={styles.calendarArea}>
        <CalendarGrid
          events={events}
          canManageEvents={membership?.role === "event_director"}
        />
      </div>
    </div>
  );
}
