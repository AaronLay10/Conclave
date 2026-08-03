"use client";

import { CheckCircle2, Copy, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  singleEventMailForEvent,
  withoutCityHallRequirements
} from "@/lib/event-instruction-library";
import { createClient } from "@/lib/supabase/client";
import type { RokEvent } from "@/lib/types";
import { formatUtc } from "@/lib/utils";

function discordTimestamp(value: string) {
  return Math.floor(new Date(value).getTime() / 1000);
}

function buildDiscordBody(event: RokEvent) {
  const timestamp = discordTimestamp(event.start_at);
  return [
    `**When:** <t:${timestamp}:F> — <t:${timestamp}:R>`,
    `**Scope:** ${event.scope === "kingdom" ? "Kingdom 4126" : event.alliance_name ?? "Alliance"}`,
    `**Status:** ${event.certainty.replaceAll("_", " ")}`,
    event.location ? `**Location:** ${event.location}` : "",
    "",
    event.description ?? "",
    event.preparation ? `### Prepare\n${event.preparation}` : "",
    event.rules ? `### Rules\n${event.rules}` : "",
    "",
    "Times shown by Discord automatically convert to each member’s local timezone."
  ].filter(Boolean).join("\n");
}

function safeMailText(value: string) {
  return withoutCityHallRequirements(value).replace(/[<>]/g, "").trim();
}

function buildGenericIngameMail(event: RokEvent) {
  return [
    `<size=34><b><color=#855400>${safeMailText(event.name.toUpperCase())}</color></b></size>`,
    `<color=#1E5F8A>${formatUtc(event.start_at)}</color>`,
    "",
    event.description ? safeMailText(event.description) : "",
    event.preparation
      ? `<size=27><b><color=#176B3A>PREPARE</color></b></size>\n${safeMailText(event.preparation)}`
      : "",
    event.rules
      ? `<size=27><b><color=#176B3A>INSTRUCTIONS</color></b></size>\n${safeMailText(event.rules)}`
      : ""
  ].filter(Boolean).join("\n\n");
}

export function AnnouncementGenerator({ events }: { events: RokEvent[] }) {
  const [selectedId, setSelectedId] = useState(events[0]?.id ?? "");
  const [copied, setCopied] = useState("");
  const [discordTitle, setDiscordTitle] = useState("");
  const [discordBody, setDiscordBody] = useState("");
  const [ingameBody, setIngameBody] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState("");
  const [publishError, setPublishError] = useState("");

  const event = events.find(item => item.id === selectedId) ?? events[0];
  const generatedDiscordBody = useMemo(
    () => event ? buildDiscordBody(event) : "",
    [event]
  );
  const generatedIngameBody = useMemo(
    () => event ? singleEventMailForEvent(event) ?? buildGenericIngameMail(event) : "",
    [event]
  );

  useEffect(() => {
    if (!event) return;
    setDiscordTitle(event.name);
    setDiscordBody(generatedDiscordBody);
    setIngameBody(generatedIngameBody);
    setPublishMessage("");
    setPublishError("");
  }, [event, generatedDiscordBody, generatedIngameBody]);

  async function copy(name: string, content: string) {
    await navigator.clipboard.writeText(content);
    setCopied(name);
    window.setTimeout(() => setCopied(""), 1500);
  }

  async function publishToDiscord() {
    if (!event) return;

    setPublishing(true);
    setPublishMessage("");
    setPublishError("");

    let announcementId: string | null = null;

    try {
      if (!discordTitle.trim()) throw new Error("A Discord title is required.");
      if (!discordBody.trim()) throw new Error("A Discord message is required.");
      if (discordTitle.length > 256) throw new Error("Discord titles are limited to 256 characters.");
      if (discordBody.length > 4096) throw new Error("Discord embed messages are limited to 4,096 characters.");

      const supabase = createClient();
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Your Conclave session has expired. Sign in again.");
      }

      const { data: announcement, error: insertError } = await supabase
        .from("announcements")
        .insert({
          event_id: event.id,
          channel: "discord",
          title: discordTitle.trim(),
          body: discordBody.trim(),
          status: "approved",
          created_by: user.id,
          approved_by: user.id
        })
        .select("id")
        .single();

      if (insertError || !announcement) {
        throw new Error(insertError?.message ?? "Unable to create the announcement record.");
      }

      announcementId = announcement.id;

      const { data, error: invokeError } = await supabase.functions.invoke(
        "publish-discord",
        {
          body: {
            action: "publish",
            announcementId: announcement.id
          }
        }
      );

      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);

      setPublishMessage("Published to Discord and recorded in Conclave.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to publish to Discord.";
      setPublishError(message);

      if (announcementId) {
        try {
          const supabase = createClient();
          await supabase
            .from("announcements")
            .update({ status: "failed", last_error: message })
            .eq("id", announcementId);
        } catch {
          // The original publication error remains the actionable message.
        }
      }
    } finally {
      setPublishing(false);
    }
  }

  if (!event) return <div className="empty">Create an event before generating announcements.</div>;

  const discordCopy = `# ${discordTitle}\n\n${discordBody}`;

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
            <div>
              <strong>Discord publishing desk</strong>
              <div className="muted" style={{ fontSize: ".76rem" }}>
                Editable rich embed with automatic local-time timestamps
              </div>
            </div>
            <button className="button" type="button" onClick={() => copy("discord", discordCopy)}>
              <Copy size={15} /> {copied === "discord" ? "Copied" : "Copy"}
            </button>
          </div>

          <div className="card-body">
            <div className="form">
              <div className="field">
                <label htmlFor="discord-title">Title</label>
                <input
                  id="discord-title"
                  value={discordTitle}
                  maxLength={256}
                  onChange={event => setDiscordTitle(event.target.value)}
                />
              </div>

              <div className="field">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <label htmlFor="discord-body">Message</label>
                  <span className={`counter ${discordBody.length > 4096 ? "over" : ""}`}>
                    {discordBody.length} / 4,096
                  </span>
                </div>
                <textarea
                  id="discord-body"
                  value={discordBody}
                  onChange={event => setDiscordBody(event.target.value)}
                  style={{ minHeight: 330 }}
                />
              </div>

              {publishMessage && (
                <div className="row" style={{ color: "var(--green)" }}>
                  <CheckCircle2 size={17} /> {publishMessage}
                </div>
              )}
              {publishError && <div className="form-error">{publishError}</div>}

              <div className="actions">
                <button
                  className="button primary"
                  type="button"
                  onClick={publishToDiscord}
                  disabled={publishing || discordBody.length > 4096}
                >
                  <Send size={16} /> {publishing ? "Publishing…" : "Publish to Discord"}
                </button>
                <span className="muted" style={{ fontSize: ".76rem" }}>
                  Configure and test the webhook under Settings first.
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <strong>In-game mail</strong>
              <div className={`counter ${ingameBody.length > 2000 ? "over" : ""}`}>
                {ingameBody.length} / 2,000 characters
              </div>
            </div>
            <button
              className="button"
              type="button"
              disabled={ingameBody.length > 2000}
              onClick={() => copy("ingame", ingameBody)}
            >
              <Copy size={15} /> {copied === "ingame" ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="card-body">
            <div className="field">
              <label htmlFor="ingame-body">Editable member announcement</label>
              <textarea
                id="ingame-body"
                value={ingameBody}
                onChange={(event) => setIngameBody(event.target.value)}
                style={{ minHeight: 430 }}
              />
            </div>
            <p className="muted" style={{ fontSize: ".76rem", marginBottom: 0 }}>
              Researched instructions are loaded automatically for supported events. Review and edit leadership details before copying.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
