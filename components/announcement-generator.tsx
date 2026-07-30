"use client";

import { useMemo, useState } from "react";
import type { RokEvent } from "@/lib/types";
import { formatUtc } from "@/lib/utils";

function discordTimestamp(value: string) {
  return Math.floor(new Date(value).getTime() / 1000);
}

export function AnnouncementGenerator({ events }: { events: RokEvent[] }) {
  const [selectedId, setSelectedId] = useState(events[0]?.id ?? "");
  const [copied, setCopied] = useState("");
  const event = events.find(item => item.id === selectedId) ?? events[0];

  const discord = useMemo(() => {
    if (!event) return "";
    const timestamp = discordTimestamp(event.start_at);
    return [
      `# ${event.name}`,
      "",
      `**When:** <t:${timestamp}:F> — <t:${timestamp}:R>`,
      `**Scope:** ${event.scope === "kingdom" ? "Kingdom 4126" : event.alliance_name ?? "Alliance"}`,
      `**Status:** ${event.certainty.replaceAll("_", " ")}`,
      "",
      event.description ?? "",
      event.preparation ? `## Prepare\n${event.preparation}` : "",
      event.rules ? `## Rules\n${event.rules}` : "",
      "",
      "Times shown by Discord automatically convert to your local timezone."
    ].filter(Boolean).join("\n");
  }, [event]);

  const ingame = useMemo(() => {
    if (!event) return "";
    return [
      event.name.toUpperCase(),
      "",
      `TIME: ${formatUtc(event.start_at)}`,
      "",
      event.description ?? "",
      event.preparation ? `PREPARE: ${event.preparation}` : "",
      event.rules ? `RULES: ${event.rules}` : "",
      "",
      "Watch kingdom Discord and alliance mail for updates."
    ].filter(Boolean).join("\n");
  }, [event]);

  async function copy(name: string, content: string) {
    await navigator.clipboard.writeText(content);
    setCopied(name);
    window.setTimeout(() => setCopied(""), 1500);
  }

  if (!event) return <div className="empty">Create an event before generating announcements.</div>;

  return (
    <>
      <div className="field" style={{ marginBottom: 18 }}>
        <label htmlFor="event-select">Event</label>
        <select id="event-select" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
          {events.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}
        </select>
      </div>
      <div className="grid cols-2">
        <div className="card">
          <div className="card-header">
            <div><strong>Discord announcement</strong><div className="muted" style={{ fontSize: ".76rem" }}>Uses automatic local-time timestamps</div></div>
            <button className="button" onClick={() => copy("discord", discord)}>{copied === "discord" ? "Copied" : "Copy"}</button>
          </div>
          <div className="card-body"><div className="copy-box">{discord}</div></div>
        </div>
        <div className="card">
          <div className="card-header">
            <div><strong>In-game mail</strong><div className={`counter ${ingame.length > 2000 ? "over" : ""}`}>{ingame.length} / 2,000 characters</div></div>
            <button className="button" onClick={() => copy("ingame", ingame)}>{copied === "ingame" ? "Copied" : "Copy"}</button>
          </div>
          <div className="card-body"><div className="copy-box">{ingame}</div></div>
        </div>
      </div>
    </>
  );
}
