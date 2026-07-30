import { DemoBanner } from "@/components/demo-banner";
import { EventForm } from "@/components/event-form";

export default function NewEventPage() {
  return (
    <>
      <DemoBanner />
      <div className="page-header">
        <div>
          <h1>Create Event</h1>
          <p className="muted">Add the operational record first; announcements and reminders follow.</p>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <EventForm />
        </div>
      </div>
    </>
  );
}
