import { AnnouncementGenerator } from "@/components/announcement-generator";
import { DailyMailGenerator } from "@/components/daily-mail-generator";
import { DemoBanner } from "@/components/demo-banner";
import { getEvents } from "@/lib/data";

export default async function AnnouncementsPage() {
  const events = await getEvents();

  return (
    <>
      <DemoBanner />
      <div className="page-header">
        <div>
          <h1>Announcement Generator</h1>
          <p className="muted">Create coordinated Discord posts and in-game mail from the official event record.</p>
        </div>
      </div>
      <DailyMailGenerator events={events} />
      <section className="section">
        <h2>Single-event announcements</h2>
        <p className="muted">Create a focused Discord post or in-game mail for one event.</p>
      </section>
      <AnnouncementGenerator events={events} />
    </>
  );
}
