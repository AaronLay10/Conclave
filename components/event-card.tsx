import Link from "next/link";
import { CalendarClock, Shield, UserRound } from "lucide-react";
import type { RokEvent } from "@/lib/types";
import { formatUtc } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";

export function EventCard({ event }: { event: RokEvent }) {
  return (
    <Link href={`/events/${event.id}`} className="card event-card">
      <div className="row space-between">
        <div>
          <h3>{event.name}</h3>
          <div className="row">
            <StatusBadge value={event.certainty} />
            <StatusBadge value={event.status} />
          </div>
        </div>
      </div>
      <div className="details" style={{ marginTop: 14 }}>
        <span className="row"><CalendarClock size={15} /> {formatUtc(event.start_at)}</span>
        <span className="row"><Shield size={15} /> {event.scope === "kingdom" ? "Kingdom-wide" : event.alliance_name ?? "Alliance event"}</span>
        <span className="row"><UserRound size={15} /> {event.owner_name ?? "Owner not assigned"}</span>
      </div>
    </Link>
  );
}
