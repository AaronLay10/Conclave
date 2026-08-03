"use client";

import { Copy, Mail, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import type { RokEvent } from "@/lib/types";

const DAY_MS = 86_400_000;

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

function eventEndLabel(event: RokEvent) {
  const end = new Date(event.end_at);
  const isReset = end.getUTCHours() === 0 && end.getUTCMinutes() === 0;

  if (isReset) {
    return `Through ${dateLabel(new Date(end.getTime() - 1))}`;
  }

  const time = `${String(end.getUTCHours()).padStart(2, "0")}:${String(end.getUTCMinutes()).padStart(2, "0")}`;
  return `Ends ${dateLabel(end)} ${time}`;
}

function firstSentence(value: string, maxLength: number) {
  const sentence = value.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() ?? value.trim();
  if (sentence.length <= maxLength) return sentence;
  return `${sentence.slice(0, maxLength - 1).trimEnd()}…`;
}

function actionSummary(event: RokEvent, maxLength: number) {
  if (event.preparation) return firstSentence(event.preparation, maxLength);
  if (event.scope === "alliance") {
    return firstSentence("Watch alliance announcements for the confirmed time and instructions.", maxLength);
  }
  if (event.certainty !== "confirmed") {
    return firstSentence("Open the event page at reset and follow the listed objectives.", maxLength);
  }
  if (event.description) return firstSentence(event.description, maxLength);
  return firstSentence("Check Conclave and the in-game event page for instructions.", maxLength);
}

function isPublicWorkflow(event: RokEvent) {
  return ["review", "approved", "published", "active", "completed"].includes(event.status);
}

function composeMail({
  events,
  reportDate,
  horizonDays,
  includeTentative,
  leadershipNote,
  summaryLength,
  upcomingLimit
}: {
  events: RokEvent[];
  reportDate: string;
  horizonDays: number;
  includeTentative: boolean;
  leadershipNote: string;
  summaryLength: number;
  upcomingLimit: number;
}) {
  const start = utcDay(reportDate);
  const end = new Date(start.getTime() + DAY_MS);
  const horizon = new Date(start.getTime() + horizonDays * DAY_MS);
  const eligible = events
    .filter(isPublicWorkflow)
    .filter((event) => includeTentative || event.certainty === "confirmed");
  const active = eligible.filter((event) =>
    new Date(event.start_at) < end && new Date(event.end_at) > start
  );
  const upcoming = eligible
    .filter((event) => new Date(event.start_at) >= end && new Date(event.start_at) < horizon)
    .slice(0, upcomingLimit);
  const omittedUpcoming = eligible.filter((event) =>
    new Date(event.start_at) >= end && new Date(event.start_at) < horizon
  ).length - upcoming.length;

  const lines = [
    `K4126 DAILY EVENT UPDATE — ${dateLabel(start)}`,
    "All dates and times are UTC. In-game changes take priority.",
    ""
  ];

  lines.push("ACTIVE");
  if (active.length === 0) lines.push("No tracked events are active today.");
  for (const event of active) {
    const marker = event.certainty === "confirmed" ? "" : " *";
    lines.push(`• ${event.name.toUpperCase()}${marker} — ${eventEndLabel(event)}: ${actionSummary(event, summaryLength)}`);
  }

  lines.push("", "COMING NEXT");
  if (upcoming.length === 0) lines.push(`No tracked starts in the next ${horizonDays - 1} days.`);

  let previousLabel = "";
  for (const event of upcoming) {
    const label = dateLabel(new Date(event.start_at));
    const marker = event.certainty === "confirmed" ? "" : "*";
    if (label !== previousLabel) lines.push(label);
    lines.push(`• ${event.name}${marker}: ${actionSummary(event, summaryLength)}`);
    previousLabel = label;
  }
  if (omittedUpcoming > 0) lines.push(`+ ${omittedUpcoming} more events in Conclave`);

  const tentative = [...active, ...upcoming].filter((event) => event.certainty !== "confirmed");
  if (tentative.length > 0 || leadershipNote.trim()) {
    lines.push("", "CHANGES & NOTES");
    if (leadershipNote.trim()) lines.push(leadershipNote.trim());
    if (tentative.length > 0) {
      lines.push("* Tentative calendar window or time; await leadership confirmation.");
    }
  }

  lines.push("", "Watch Discord and Conclave for confirmed times and kingdom rules.");
  return lines.join("\n");
}

export function DailyMailGenerator({ events }: { events: RokEvent[] }) {
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [horizonDays, setHorizonDays] = useState(7);
  const [includeTentative, setIncludeTentative] = useState(true);
  const [leadershipNote, setLeadershipNote] = useState("");
  const [copied, setCopied] = useState(false);

  const mail = useMemo(() => {
    const options = { events, reportDate, horizonDays, includeTentative, leadershipNote };
    let value = composeMail({ ...options, summaryLength: 120, upcomingLimit: 30 });
    if (value.length > 2000) {
      value = composeMail({ ...options, summaryLength: 80, upcomingLimit: 30 });
    }
    if (value.length > 2000) {
      value = composeMail({ ...options, summaryLength: 60, upcomingLimit: 15 });
    }
    return value.length <= 2000
      ? value
      : `${value.slice(0, 1940).trimEnd()}\n\nSee Conclave for the complete schedule.`;
  }, [events, reportDate, horizonDays, includeTentative, leadershipNote]);

  async function copyMail() {
    await navigator.clipboard.writeText(mail);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  function reset() {
    setReportDate(new Date().toISOString().slice(0, 10));
    setHorizonDays(7);
    setIncludeTentative(true);
    setLeadershipNote("");
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="row"><Mail size={18} /><strong>Daily member mail</strong></div>
          <div className="muted" style={{ fontSize: ".76rem", marginTop: 4 }}>
            Assembled from live Conclave events
          </div>
        </div>
        <div className="actions">
          <button className="button" type="button" onClick={reset}><RotateCcw size={15} /> Reset</button>
          <button className="button primary" type="button" onClick={copyMail}>
            <Copy size={15} /> {copied ? "Copied" : "Copy mail"}
          </button>
        </div>
      </div>
      <div className="card-body grid cols-2 daily-mail-layout">
        <div className="form">
          <div className="form-grid">
            <div className="field">
              <label htmlFor="mail-report-date">Update date (UTC)</label>
              <input
                id="mail-report-date"
                type="date"
                value={reportDate}
                onChange={(event) => setReportDate(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="mail-horizon">Upcoming window</label>
              <select
                id="mail-horizon"
                value={horizonDays}
                onChange={(event) => setHorizonDays(Number(event.target.value))}
              >
                <option value={3}>Next 2 days</option>
                <option value={5}>Next 4 days</option>
                <option value={7}>Next 6 days</option>
                <option value={8}>Next 7 days</option>
              </select>
            </div>
          </div>

          <label className="import-replace">
            <input
              type="checkbox"
              checked={includeTentative}
              onChange={(event) => setIncludeTentative(event.target.checked)}
            />
            <span>
              <strong>Include tentative calendar windows</strong>
              <small>They are marked with an asterisk and a confirmation warning.</small>
            </span>
          </label>

          <div className="field">
            <label htmlFor="leadership-note">Leadership changes or note</label>
            <textarea
              id="leadership-note"
              value={leadershipNote}
              maxLength={500}
              placeholder="Example: Dark Fortress Raid moved to 19:00 UTC."
              onChange={(event) => setLeadershipNote(event.target.value)}
            />
          </div>
        </div>

        <div>
          <div className={`counter ${mail.length > 2000 ? "over" : ""}`} style={{ marginBottom: 8 }}>
            {mail.length} / 2,000 characters
          </div>
          <div className="copy-box daily-mail-preview">{mail}</div>
        </div>
      </div>
    </div>
  );
}
