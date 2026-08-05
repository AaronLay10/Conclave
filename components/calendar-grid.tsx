"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths
} from "date-fns";
import { Check, ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { useMemo, useState } from "react";
import type { RokEvent } from "@/lib/types";
import styles from "./calendar-grid.module.css";

function utcDateKey(value: string) {
  return value.slice(0, 10);
}

function utcTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(new Date(value));
}

type PredictionConfidence = "high" | "medium-high" | "medium" | "low" | "unknown";

function predictionConfidence(event: RokEvent): PredictionConfidence {
  const raw = event.source_details?.confidence;
  if (typeof raw !== "string") return "unknown";

  const value = raw.toLowerCase().replaceAll("_", "-");
  if (value === "high") return "high";
  if (value === "medium-high") return "medium-high";
  if (value === "medium") return "medium";
  if (value === "low") return "low";
  return "unknown";
}

function eventAppearance(event: RokEvent) {
  if (event.certainty === "confirmed") {
    return { className: styles.verified, mark: "✓", label: "Verified" };
  }

  if (event.certainty === "predicted") {
    switch (predictionConfidence(event)) {
      case "high":
        return { className: styles.predictedHigh, mark: "H", label: "Predicted · high confidence" };
      case "medium-high":
        return { className: styles.predictedMediumHigh, mark: "M+", label: "Predicted · medium-high confidence" };
      case "medium":
        return { className: styles.predictedMedium, mark: "M", label: "Predicted · medium confidence" };
      case "low":
        return { className: styles.predictedLow, mark: "L", label: "Predicted · low confidence" };
      default:
        return { className: styles.predictedUnknown, mark: "P", label: "Predicted · confidence not rated" };
    }
  }

  if (event.certainty === "leadership_scheduled") {
    return { className: styles.leadershipScheduled, mark: "L", label: "Leadership scheduled" };
  }

  return { className: styles.tbd, mark: "?", label: "TBD" };
}

export function CalendarGrid({ events }: { events: RokEvent[] }) {
  const router = useRouter();
  const [month, setMonth] = useState(new Date(2026, 7, 1));
  const [confirming, setConfirming] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end }).map((day) => {
      const dayKey = format(day, "yyyy-MM-dd");
      return {
        day,
        dayKey,
        dayEvents: events.filter((event) => utcDateKey(event.start_at) === dayKey)
      };
    });
  }, [events, month]);

  async function verifyPrediction(event: RokEvent) {
    setConfirming(event.id);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/events/${event.id}/confirm`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "The prediction could not be verified.");
      setMessage(`${event.name} is now verified.`);
      router.refresh();
    } catch (verificationError) {
      setError(verificationError instanceof Error
        ? verificationError.message
        : "The prediction could not be verified.");
    } finally {
      setConfirming(null);
    }
  }

  const todayUtc = new Date().toISOString().slice(0, 10);
  const visibleEvents = days.some((entry) => entry.dayEvents.length > 0);

  return (
    <>
      <div className={styles.legend} aria-label="Calendar certainty colors">
        <span><i className={`${styles.legendSwatch} ${styles.verifiedSwatch}`} /> Verified</span>
        <span><i className={`${styles.legendSwatch} ${styles.highSwatch}`} /> Predicted · High</span>
        <span><i className={`${styles.legendSwatch} ${styles.mediumHighSwatch}`} /> Predicted · Medium-high</span>
        <span><i className={`${styles.legendSwatch} ${styles.mediumSwatch}`} /> Predicted · Medium</span>
        <span><i className={`${styles.legendSwatch} ${styles.leadershipSwatch}`} /> Leadership scheduled</span>
        <span><i className={`${styles.legendSwatch} ${styles.tbdSwatch}`} /> TBD</span>
      </div>

      {message && <div className="form-success" role="status">{message}</div>}
      {error && <div className="form-error" role="alert">{error}</div>}

      <div className="card calendar-shell">
        <div className="calendar-toolbar">
          <button
            className="icon-button"
            onClick={() => setMonth(subMonths(month, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <div style={{ textAlign: "center" }}>
            <strong>{format(month, "MMMM yyyy")}</strong>
            <div className="muted calendar-timezone-note">
              Calendar dates and times are UTC
            </div>
          </div>
          <button
            className="icon-button"
            onClick={() => setMonth(addMonths(month, 1))}
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="calendar-weekdays">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div className="calendar-weekday" key={day}>{day}</div>
          ))}
        </div>

        <div className="calendar-grid">
          {days.map(({ day, dayKey, dayEvents }) => (
            <div
              className={`calendar-day ${!isSameMonth(day, month) ? "outside" : ""} ${dayEvents.length === 0 ? "empty-day" : ""}`}
              key={day.toISOString()}
            >
              <div className={`calendar-date ${dayKey === todayUtc ? "today" : ""}`}>
                <span>{format(day, "d")}</span>
                <span className="calendar-date-full">{format(day, "EEEE, MMM d")}</span>
                {dayEvents.length > 0 && <span>{dayEvents.length}</span>}
              </div>

              {dayEvents.slice(0, 4).map((event) => {
                const appearance = eventAppearance(event);
                const isPredicted = event.certainty === "predicted";
                const isConfirming = confirming === event.id;

                return (
                  <div
                    className={`${styles.eventEntry} ${isPredicted ? styles.withAction : ""}`}
                    key={event.id}
                  >
                    <Link
                      href={`/events/${event.id}`}
                      className={`calendar-event ${event.scope} certainty-${event.certainty} ${styles.eventLink} ${appearance.className}`}
                      title={`${event.name} · ${appearance.label}`}
                    >
                      <span className={styles.certaintyMark} aria-hidden="true">{appearance.mark}</span>
                      <span className={styles.eventText}>{utcTime(event.start_at)} {event.name}</span>
                    </Link>

                    {isPredicted && (
                      <button
                        className={styles.verifyButton}
                        type="button"
                        onClick={() => verifyPrediction(event)}
                        disabled={Boolean(confirming)}
                        aria-label={`Verify prediction for ${event.name}`}
                        title={`Approve ${event.name} as verified`}
                      >
                        {isConfirming
                          ? <LoaderCircle size={13} className="spin" />
                          : <Check size={13} />}
                        <span className={styles.verifyText}>{isConfirming ? "Verifying…" : "Verify"}</span>
                      </button>
                    )}
                  </div>
                );
              })}

              {dayEvents.length > 4 && (
                <div className="muted calendar-day-overflow">
                  +{dayEvents.length - 4} more
                </div>
              )}
            </div>
          ))}
        </div>
        {!visibleEvents && (
          <div className="empty calendar-month-empty">No events scheduled this month.</div>
        )}
      </div>
    </>
  );
}
