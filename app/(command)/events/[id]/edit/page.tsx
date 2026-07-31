import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { DemoBanner } from "@/components/demo-banner";
import { EventForm } from "@/components/event-form";
import { getEvent } from "@/lib/data";

export default async function EditEventPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEvent(id);

  if (!event) notFound();

  return (
    <>
      <DemoBanner />
      <div className="page-header">
        <div>
          <Link href={`/events/${event.id}`} className="row muted" style={{ marginBottom: 10 }}>
            <ArrowLeft size={15} /> Back to event
          </Link>
          <h1>Edit Event</h1>
          <p className="muted">Update the operational record. Saved changes immediately affect the calendar and announcement generator.</p>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <EventForm event={event} />
        </div>
      </div>
    </>
  );
}
