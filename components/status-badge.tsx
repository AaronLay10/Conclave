import type { EventCertainty, EventStatus } from "@/lib/types";

const labels: Record<EventCertainty | EventStatus, string> = {
  confirmed: "Confirmed",
  predicted: "Predicted",
  leadership_scheduled: "Leadership Scheduled",
  tbd: "TBD",
  draft: "Draft",
  review: "Review",
  approved: "Approved",
  published: "Published",
  active: "Active",
  completed: "Completed",
  archived: "Archived"
};

export function StatusBadge({
  value
}: {
  value: EventCertainty | EventStatus;
}) {
  return <span className={`badge ${value}`}>{labels[value]}</span>;
}
