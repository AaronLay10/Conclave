"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { RokEvent } from "@/lib/types";

function toUtcDateTimeInput(value?: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 16);
}

export function EventForm({ event }: { event?: RokEvent }) {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const editing = Boolean(event);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(formData: FormData) {
    setSaving(true);
    setMessage("");

    try {
      const payload = Object.fromEntries(formData.entries());
      const response = await fetch(editing ? `/api/events/${event!.id}` : "/api/events", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error ?? `Unable to ${editing ? "update" : "create"} event.`);
        return;
      }

      router.push(`/events/${result.event.id}`);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : `Unable to ${editing ? "update" : "create"} event.`
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="form"
      action={async formData => {
        await submit(formData);
      }}
    >
      <div className="form-grid">
        <div className="field full">
          <label htmlFor="name">Event name</label>
          <input
            id="name"
            name="name"
            required
            defaultValue={event?.name ?? ""}
            placeholder="Dark Fortress Raid — 126V"
          />
        </div>
        <div className="field">
          <label htmlFor="category">Category</label>
          <input
            id="category"
            name="category"
            required
            defaultValue={event?.category ?? ""}
            placeholder="Alliance Raid"
          />
        </div>
        <div className="field">
          <label htmlFor="scope">Scope</label>
          <select id="scope" name="scope" defaultValue={event?.scope ?? "kingdom"}>
            <option value="kingdom">Kingdom</option>
            <option value="alliance">Alliance</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="start_at">Start date and time (UTC)</label>
          <input
            id="start_at"
            name="start_at"
            type="datetime-local"
            required
            defaultValue={toUtcDateTimeInput(event?.start_at)}
          />
        </div>
        <div className="field">
          <label htmlFor="end_at">End date and time (UTC)</label>
          <input
            id="end_at"
            name="end_at"
            type="datetime-local"
            required
            defaultValue={toUtcDateTimeInput(event?.end_at)}
          />
        </div>
        <div className="field">
          <label htmlFor="certainty">Certainty</label>
          <select id="certainty" name="certainty" defaultValue={event?.certainty ?? "confirmed"}>
            <option value="confirmed">Confirmed</option>
            <option value="predicted">Predicted</option>
            <option value="leadership_scheduled">Leadership scheduled</option>
            <option value="tbd">TBD</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="status">Workflow status</label>
          <select id="status" name="status" defaultValue={event?.status ?? "draft"}>
            <option value="draft">Draft</option>
            <option value="review">Leadership review</option>
            <option value="approved">Approved</option>
            <option value="published">Published</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div className="field full">
          <label htmlFor="location">Location</label>
          <input
            id="location"
            name="location"
            defaultValue={event?.location ?? ""}
            placeholder="Rise of Kingdoms, Discord channel, coordinates, or zone"
          />
        </div>
        <div className="field full">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            defaultValue={event?.description ?? ""}
            placeholder="Purpose and operational context..."
          />
        </div>
        <div className="field full">
          <label htmlFor="preparation">Member preparation</label>
          <textarea
            id="preparation"
            name="preparation"
            defaultValue={event?.preparation ?? ""}
            placeholder="What members must do before the event..."
          />
        </div>
        <div className="field full">
          <label htmlFor="rules">Rules and instructions</label>
          <textarea
            id="rules"
            name="rules"
            defaultValue={event?.rules ?? ""}
            placeholder="Kingdom or alliance rules..."
          />
        </div>
      </div>

      {message && <div className="form-error">{message}</div>}
      {!configured && (
        <div className="form-error">
          {editing ? "Editing" : "Create"} is disabled in demo mode. Configure Supabase to enable write actions.
        </div>
      )}

      <div className="actions">
        <button className="button primary" disabled={!configured || saving} type="submit">
          {saving
            ? editing
              ? "Saving…"
              : "Creating…"
            : editing
              ? "Save changes"
              : "Create event"}
        </button>
        <button className="button" type="button" onClick={() => router.back()} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
