import { AnnouncementGenerator } from "@/components/announcement-generator";
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
      <AnnouncementGenerator events={events} />
    </>
  );
}
