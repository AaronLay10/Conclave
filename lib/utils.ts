import { formatDistanceToNowStrict } from "date-fns";
import type { RokEvent } from "@/lib/types";

export function formatUtc(value: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(new Date(value));

  return `${parts} UTC`;
}

export function timeUntil(value: string) {
  return formatDistanceToNowStrict(new Date(value), { addSuffix: true });
}

export function eventIsActive(event: RokEvent, now = new Date()) {
  return new Date(event.start_at) <= now && new Date(event.end_at) > now;
}

export function eventIsUpcoming(event: RokEvent, now = new Date()) {
  return new Date(event.start_at) > now;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
