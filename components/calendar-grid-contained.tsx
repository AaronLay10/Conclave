"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type MouseEvent
} from "react";
import { CalendarGrid } from "@/components/calendar-grid";
import type { RokEvent } from "@/lib/types";
import styles from "./calendar-grid-contained.module.css";

const DAY_MS = 86_400_000;
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type CalendarGridProps = ComponentProps<typeof CalendarGrid>;
type SelectedDay = { dayKey: string; label: string };

function eventOccursOnDay(event: RokEvent, dayKey: string) {
  const dayStart = Date.parse(`${dayKey}T00:00:00Z`);
  const dayEnd = dayStart + DAY_MS;
  return Date.parse(event.start_at) < dayEnd && Date.parse(event.end_at) > dayStart;
}

function certaintyLabel(event: RokEvent) {
  if (event.certainty !== "predicted") return event.certainty.replaceAll("_", " ");
  const confidence = event.source_details?.confidence;
  if (typeof confidence !== "string") return "predicted";
  return `predicted · ${confidence.replaceAll("_", "-")}`;
}

function resolveDay(dayCell: Element, root: HTMLElement): SelectedDay | null {
  const fullDate = dayCell.querySelector(".calendar-date-full")?.textContent?.trim();
  const monthHeading = root.querySelector(".calendar-toolbar strong")?.textContent?.trim();
  if (!fullDate || !monthHeading) return null;

  const headingMatch = monthHeading.match(/^([A-Za-z]+)\s+(\d{4})$/);
  const dayMatch = fullDate.match(/,\s*([A-Za-z]{3})\s+(\d{1,2})$/);
  if (!headingMatch || !dayMatch) return null;

  const calendarMonth = MONTHS.indexOf(headingMatch[1]);
  const eventMonth = SHORT_MONTHS.indexOf(dayMatch[1]);
  if (calendarMonth < 0 || eventMonth < 0) return null;

  let year = Number(headingMatch[2]);
  if (calendarMonth === 0 && eventMonth === 11) year -= 1;
  if (calendarMonth === 11 && eventMonth === 0) year += 1;

  const day = Number(dayMatch[2]);
  const dayKey = `${year}-${String(eventMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return {
    dayKey,
    label: new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    }).format(new Date(`${dayKey}T00:00:00Z`))
  };
}

export function CalendarGridContained({
  events,
  canManageEvents = false
}: CalendarGridProps) {
  const router = useRouter();
  const guardRef = useRef<HTMLDivElement>(null);
  const [selectedDay, setSelectedDay] = useState<SelectedDay | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedEvents = useMemo(() => {
    if (!selectedDay) return [];
    return events
      .filter((event) => eventOccursOnDay(event, selectedDay.dayKey))
      .sort((left, right) => left.start_at.localeCompare(right.start_at) || left.name.localeCompare(right.name));
  }, [events, selectedDay]);

  useEffect(() => {
    const root = guardRef.current;
    if (!root) return;

    const decorateOverflowControls = () => {
      root.querySelectorAll<HTMLElement>(".calendar-day-overflow").forEach((control) => {
        control.setAttribute("role", "button");
        control.setAttribute("tabindex", "0");
        control.setAttribute("aria-label", `${control.textContent?.trim() ?? "More events"}. Show all events for this day.`);
      });
    };

    decorateOverflowControls();
    const observer = new MutationObserver(decorateOverflowControls);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setSelectedDay(null);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, []);

  function openOverflow(target: Element) {
    const root = guardRef.current;
    const dayCell = target.closest(".calendar-day");
    if (!root || !dayCell) return;
    const day = resolveDay(dayCell, root);
    if (!day) return;
    setError(null);
    setSelectedDay(day);
  }

  function handleClickCapture(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const overflow = target.closest(".calendar-day-overflow");
    if (overflow) {
      event.preventDefault();
      event.stopPropagation();
      openOverflow(overflow);
      return;
    }

    if (target.closest(".calendar-toolbar button")) setSelectedDay(null);
  }

  function handleKeyDownCapture(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const overflow = target.closest(".calendar-day-overflow");
    if (!overflow) return;
    event.preventDefault();
    openOverflow(overflow);
  }

  async function approve(event: RokEvent) {
    setConfirming(event.id);
    setError(null);
    try {
      const response = await fetch(`/api/events/${event.id}/confirm`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "The prediction could not be approved.");
      router.refresh();
    } catch (approvalError) {
      setError(approvalError instanceof Error ? approvalError.message : "The prediction could not be approved.");
    } finally {
      setConfirming(null);
    }
  }

  async function removeEvent(event: RokEvent) {
    const confirmed = window.confirm(
      `Remove “${event.name}” from the calendar?\n\nThis permanently deletes the event and cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(event.id);
    setError(null);
    try {
      const response = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "The event could not be removed.");
      setSelectedDay(null);
      router.refresh();
    } catch (removalError) {
      setError(removalError instanceof Error ? removalError.message : "The event could not be removed.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div
      className={styles.guard}
      ref={guardRef}
      onClickCapture={handleClickCapture}
      onKeyDownCapture={handleKeyDownCapture}
    >
      <CalendarGrid events={events} canManageEvents={canManageEvents} />

      {selectedDay && (
        <div className={styles.backdrop} role="presentation" onMouseDown={() => setSelectedDay(null)}>
          <section
            className={styles.dayPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-day-panel-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.dayPanelHeader}>
              <div>
                <strong id="calendar-day-panel-title">{selectedDay.label}</strong>
                <span>{selectedEvents.length} events</span>
              </div>
              <button type="button" onClick={() => setSelectedDay(null)} aria-label="Close day events">×</button>
            </div>

            {error && <div className={styles.panelError} role="alert">{error}</div>}

            <div className={styles.dayEventList}>
              {selectedEvents.map((event) => (
                <article className={styles.dayEvent} key={event.id}>
                  <div className={styles.dayEventInfo}>
                    <strong>{event.name}</strong>
                    <span>{certaintyLabel(event)} · {event.category}</span>
                  </div>
                  <div className={styles.dayEventActions}>
                    {canManageEvents && event.certainty === "predicted" && (
                      <button
                        type="button"
                        onClick={() => approve(event)}
                        disabled={confirming !== null || deleting !== null}
                      >
                        {confirming === event.id ? "Approving…" : "Approve"}
                      </button>
                    )}
                    {canManageEvents && <Link href={`/events/${event.id}/edit`}>Edit</Link>}
                    {canManageEvents && (
                      <button
                        className={styles.removeButton}
                        type="button"
                        onClick={() => removeEvent(event)}
                        disabled={confirming !== null || deleting !== null}
                      >
                        {deleting === event.id ? "Removing…" : "Remove"}
                      </button>
                    )}
                    <Link href={`/events/${event.id}`}>View details</Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
