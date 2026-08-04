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

export function CalendarGrid({ events }: { events: RokEvent[] }) {
  const [month, setMonth] = useState(new Date(2026, 7, 1));

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

  const todayUtc = new Date().toISOString().slice(0, 10);
  const visibleEvents = days.some((entry) => entry.dayEvents.length > 0);

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

            {dayEvents.slice(0, 4).map((event) => (
              <Link
                href={`/events/${event.id}`}
                className={`calendar-event ${event.scope} certainty-${event.certainty}`}
                title={event.name}
                key={event.id}
              >
                {utcTime(event.start_at)} {event.name}
              </Link>
            ))}

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
  );
}
