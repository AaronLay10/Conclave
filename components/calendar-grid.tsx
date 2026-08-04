"use client";

import Link from "next/link";
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
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import type { RokEvent } from "@/lib/types";

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

function calendarEventLabel(event: RokEvent) {
  const startsAtReset = event.start_at.slice(11, 19) === "00:00:00";
  return startsAtReset ? event.name : `${utcTime(event.start_at)} ${event.name}`;
}

export function CalendarGrid({ events }: { events: RokEvent[] }) {
  const [month, setMonth] = useState(new Date(2026, 7, 1));

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const todayUtc = new Date().toISOString().slice(0, 10);

  return (
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
          <div className="muted" style={{ fontSize: ".75rem" }}>
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
        {days.map((day) => {
          const dayKey = format(day, "yyyy-MM-dd");
          const dayEvents = events.filter(
            (event) => utcDateKey(event.start_at) === dayKey
          );

          return (
            <div
              className={`calendar-day ${!isSameMonth(day, month) ? "outside" : ""}`}
              key={day.toISOString()}
            >
              <div className={`calendar-date ${dayKey === todayUtc ? "today" : ""}`}>
                <span>{format(day, "d")}</span>
                {dayEvents.length > 0 && <span>{dayEvents.length}</span>}
              </div>

              {dayEvents.slice(0, 4).map((event) => (
                <Link
                  href={`/events/${event.id}`}
                  className={`calendar-event ${event.scope} certainty-${event.certainty}`}
                  title={event.name}
                  key={event.id}
                >
                  {calendarEventLabel(event)}
                </Link>
              ))}

              {dayEvents.length > 4 && (
                <div className="muted" style={{ fontSize: ".68rem", marginTop: 5 }}>
                  +{dayEvents.length - 4} more
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
