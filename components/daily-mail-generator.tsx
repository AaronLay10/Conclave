"use client";

import { Copy, Mail, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import {
  dailyMailSummaryForEvent,
  withoutCityHallRequirements
} from "@/lib/event-instruction-library";
import type { RokEvent } from "@/lib/types";

const DAY_MS = 86_400_000;
const GOLD = "#855400";
const GREEN = "#176B3A";
const BLUE = "#1E5F8A";
const ORANGE = "#963F00";
const BODY_SIZE = 18;
const CONTINUING_BODY_SIZE = 16;

function utcDay(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function dateLabel(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric"
  }).format(value).toUpperCase();
}

function safeMailText(value: string) {
  return value.replace(/[<>]/g, "").trim();
}

function heading(value: string, color: string, size = 27) {
  return `<size=${size}><b><color=${color}>${safeMailText(value)}</color></b></size>`;
}

function daysLeftLabel(event: RokEvent, reportStart: Date) {
  const eventDurationDays = Math.ceil(
    (new Date(event.end_at).getTime() - new Date(event.start_at).getTime()) / DAY_MS
  );

  if (eventDurationDays <= 1) return "1 DAY ONLY";

  const remainingEventDays = Math.max(
    1,
    Math.ceil((new Date(event.end_at).getTime() - reportStart.getTime()) / DAY_MS)
  );

  return remainingEventDays === 1
    ? "1 DAY LEFT"
    : `${remainingEventDays} DAYS LEFT`;
}

function actionSummary(event: RokEvent) {
  const researchedSummary = dailyMailSummaryForEvent(event);
  if (researchedSummary) return researchedSummary;
  if (event.preparation) return withoutCityHallRequirements(event.preparation);
  if (event.rules) return withoutCityHallRequirements(event.rules);
  if (event.scope === "alliance") {
    return "Await alliance leadership's confirmed time and instructions.";
  }
  if (event.certainty !== "confirmed") {
    return "Open the event page at reset and follow the listed objectives.";
  }
  if (event.description) return withoutCityHallRequirements(event.description);
  return "Open the in-game event page and follow the listed instructions.";
}

function normalizedText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function newEventInstructions(event: RokEvent) {
  const parts = [
    actionSummary(event),
    event.preparation ? withoutCityHallRequirements(event.preparation) : "",
    event.rules ? withoutCityHallRequirements(event.rules) : "",
    event.description ? withoutCityHallRequirements(event.description) : ""
  ]
    .map((value) => value.trim())
    .filter(Boolean);

  const unique: string[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    const key = normalizedText(part);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(part);
    if (unique.length === 3) break;
  }

  return unique.join(" ");
}

function isNewEventForDay(event: RokEvent, reportStart: Date) {
  const reportEnd = new Date(reportStart.getTime() + DAY_MS);
  const eventStart = new Date(event.start_at);
  return eventStart >= reportStart && eventStart < reportEnd;
}

function defaultMailText(event: RokEvent, reportStart: Date) {
  return isNewEventForDay(event, reportStart)
    ? newEventInstructions(event)
    : actionSummary(event);
}

function isPublicWorkflow(event: RokEvent) {
  return ["review", "approved", "published", "active", "completed"].includes(event.status);
}

function activeEventsForDay({
  events,
  reportDate,
  includeTentative
}: {
  events: RokEvent[];
  reportDate: string;
  includeTentative: boolean;
}) {
  const start = utcDay(reportDate);
  const end = new Date(start.getTime() + DAY_MS);
  return events
    .filter(isPublicWorkflow)
    .filter((event) => includeTentative || event.certainty === "confirmed")
    .filter((event) => new Date(event.start_at) < end && new Date(event.end_at) > start);
}

function composeMail({
  activeEvents,
  reportDate,
  summaryOverrides,
  schedulingMarkerIds
}: {
  activeEvents: RokEvent[];
  reportDate: string;
  summaryOverrides: Record<string, string>;
  schedulingMarkerIds: string[];
}) {
  const start = utcDay(reportDate);
  const newEvents = activeEvents.filter((event) => isNewEventForDay(event, start));
  const continuingEvents = activeEvents.filter((event) => !isNewEventForDay(event, start));

  const lines = [
    heading(`K4126 DAILY EVENT UPDATE — ${dateLabel(start)}`, GOLD, 34),
    `<color=${BLUE}>All times UTC • In-game changes take priority</color>`,
    ""
  ];

  if (activeEvents.length === 0) {
    lines.push("No events selected for today's mail.");
  }

  if (newEvents.length > 0) {
    lines.push(heading("NEW EVENTS", GREEN));
    for (const event of newEvents) {
      const marker = schedulingMarkerIds.includes(event.id) ? ` <color=${ORANGE}>*</color>` : "";
      const instructions = safeMailText(summaryOverrides[event.id] ?? newEventInstructions(event));
      lines.push(
        `<size=23><b>${safeMailText(event.name.toUpperCase())}</b>${marker} — <color=${GREEN}>${daysLeftLabel(event, start)}</color></size>`,
        `<size=${BODY_SIZE}>${instructions}</size>`,
        ""
      );
    }
  }

  if (continuingEvents.length > 0) {
    lines.push(heading("CONTINUING EVENTS", BLUE));
    for (const event of continuingEvents) {
      const marker = schedulingMarkerIds.includes(event.id) ? ` <color=${ORANGE}>*</color>` : "";
      const summary = safeMailText(summaryOverrides[event.id] ?? actionSummary(event));
      lines.push(
        `<size=21><b>${safeMailText(event.name.toUpperCase())}</b>${marker} — <color=${GREEN}>${daysLeftLabel(event, start)}</color></size>`,
        `<size=${CONTINUING_BODY_SIZE}>${summary}</size>`,
        ""
      );
    }
  }

  const hasSchedulingMarker = activeEvents.some((event) => schedulingMarkerIds.includes(event.id));
  if (hasSchedulingMarker) {
    lines.push(`<color=${ORANGE}>* Alliance Leadership will schedule this event.</color>`);
  }

  return lines.join("\n");
}

export function DailyMailGenerator({ events }: { events: RokEvent[] }) {
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [includeTentative, setIncludeTentative] = useState(true);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [schedulingMarkerIds, setSchedulingMarkerIds] = useState<string[]>([]);
  const [summaryOverrides, setSummaryOverrides] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const activeEvents = useMemo(
    () => activeEventsForDay({ events, reportDate, includeTentative }),
    [events, reportDate, includeTentative]
  );
  const selectedEvents = activeEvents.filter((event) => !excludedIds.includes(event.id));
  const reportStart = utcDay(reportDate);
  const mail = useMemo(
    () => composeMail({
      activeEvents: selectedEvents,
      reportDate,
      summaryOverrides,
      schedulingMarkerIds
    }),
    [selectedEvents, reportDate, summaryOverrides, schedulingMarkerIds]
  );

  async function copyMail() {
    await navigator.clipboard.writeText(mail);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  function reset() {
    setReportDate(new Date().toISOString().slice(0, 10));
    setIncludeTentative(true);
    setExcludedIds([]);
    setSchedulingMarkerIds([]);
    setSummaryOverrides({});
  }

  function toggleEvent(eventId: string, selected: boolean) {
    setExcludedIds((current) => selected
      ? current.filter((id) => id !== eventId)
      : [...new Set([...current, eventId])]
    );
  }

  function toggleSchedulingMarker(eventId: string, marked: boolean) {
    setSchedulingMarkerIds((current) => marked
      ? [...new Set([...current, eventId])]
      : current.filter((id) => id !== eventId)
    );
  }

  function selectAll() {
    const activeIds = new Set(activeEvents.map((event) => event.id));
    setExcludedIds((current) => current.filter((id) => !activeIds.has(id)));
  }

  function clearAll() {
    setExcludedIds((current) => [...new Set([
      ...current,
      ...activeEvents.map((event) => event.id)
    ])]);
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="row"><Mail size={18} /><strong>Daily member mail</strong></div>
          <div className="muted" style={{ fontSize: ".76rem", marginTop: 4 }}>
            New events get full instructions; continuing events get a short action summary.
          </div>
        </div>
        <div className="actions">
          <button className="button" type="button" onClick={reset}><RotateCcw size={15} /> Reset</button>
          <button className="button primary" type="button" onClick={copyMail} disabled={mail.length > 2000}>
            <Copy size={15} /> {copied ? "Copied" : "Copy mail"}
          </button>
        </div>
      </div>
      <div className="card-body grid cols-2 daily-mail-layout">
        <div className="form">
          <div className="field">
            <label htmlFor="mail-report-date">Update date (UTC)</label>
            <input
              id="mail-report-date"
              type="date"
              value={reportDate}
              onChange={(event) => setReportDate(event.target.value)}
            />
          </div>

          <label className="import-replace">
            <input
              type="checkbox"
              checked={includeTentative}
              onChange={(event) => setIncludeTentative(event.target.checked)}
            />
            <span>
              <strong>Include tentative calendar windows</strong>
              <small>This controls which unconfirmed calendar windows appear. Add scheduling asterisks manually below.</small>
            </span>
          </label>

          <div className="row space-between">
            <strong>{selectedEvents.length} of {activeEvents.length} active events selected</strong>
            <div className="actions">
              <button className="button" type="button" onClick={selectAll}>Select all</button>
              <button className="button" type="button" onClick={clearAll}>Clear all</button>
            </div>
          </div>

          <div className="stack">
            {activeEvents.map((event) => {
              const selected = !excludedIds.includes(event.id);
              const isNew = isNewEventForDay(event, reportStart);
              return (
                <div className={`mail-event-editor ${selected ? "selected" : ""}`} key={event.id}>
                  <label className="mail-event-select">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(input) => toggleEvent(event.id, input.target.checked)}
                    />
                    <span>
                      <strong>{event.name}</strong>
                      <small>{isNew ? "NEW EVENT" : "CONTINUING"} • {daysLeftLabel(event, reportStart)}</small>
                    </span>
                  </label>
                  {selected && (
                    <>
                      <label className="import-replace mail-schedule-marker">
                        <input
                          type="checkbox"
                          checked={schedulingMarkerIds.includes(event.id)}
                          onChange={(input) => toggleSchedulingMarker(event.id, input.target.checked)}
                        />
                        <span>
                          <strong>Add scheduling asterisk</strong>
                          <small>Alliance Leadership will schedule this event.</small>
                        </span>
                      </label>
                      <div className="field">
                        <label htmlFor={`mail-summary-${event.id}`}>
                          {isNew ? "First-day member instructions" : "Continuing-event summary"}
                        </label>
                        <textarea
                          id={`mail-summary-${event.id}`}
                          value={summaryOverrides[event.id] ?? defaultMailText(event, reportStart)}
                          maxLength={700}
                          onChange={(input) => setSummaryOverrides((current) => ({
                            ...current,
                            [event.id]: input.target.value
                          }))}
                        />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            {activeEvents.length === 0 && <div className="empty">No active events for this date.</div>}
          </div>
        </div>

        <div>
          <div className="row space-between" style={{ marginBottom: 8 }}>
            <small>Formatting renders after the code is pasted into Rise of Kingdoms.</small>
            <div className={`counter ${mail.length > 2000 ? "over" : ""}`}>
              {mail.length} / 2,000 characters
            </div>
          </div>
          <div className="copy-box daily-mail-preview">{mail}</div>
        </div>
      </div>
    </div>
  );
}
