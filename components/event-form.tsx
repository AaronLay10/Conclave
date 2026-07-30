"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function EventForm() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(formData: FormData) {
    setSaving(true);
    setMessage("");

    const payload = Object.fromEntries(formData.entries());
    const response = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      setMessage(result.error ?? "Unable to create event.");
      setSaving(false);
      return;
    }

    router.push(`/events/${result.event.id}`);
    router.refresh();
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
          <input id="name" name="name" required placeholder="Dark Fortress Raid — 126V" />
        </div>
        <div className="field">
          <label htmlFor="category">Category</label>
          <input id="category" name="category" required placeholder="Alliance Raid" />
        </div>
        <div className="field">
          <label htmlFor="scope">Scope</label>
          <select id="scope" name="scope" defaultValue="kingdom">
            <option value="kingdom">Kingdom</option>
            <option value="alliance">Alliance</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="start_at">Start date and time (UTC)</label>
          <input id="start_at" name="start_at" type="datetime-local" required />
        </div>
        <div className="field">
          <label htmlFor="end_at">End date and time (UTC)</label>
          <input id="end_at" name="end_at" type="datetime-local" required />
        </div>
        <div className="field">
          <label htmlFor="certainty">Certainty</label>
          <select id="certainty" name="certainty" defaultValue="confirmed">
            <option value="confirmed">Confirmed</option>
            <option value="predicted">Predicted</option>
            <option value="leadership_scheduled">Leadership scheduled</option>
            <option value="tbd">TBD</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="status">Workflow status</label>
          <select id="status" name="status" defaultValue="draft">
            <option value="draft">Draft</option>
            <option value="review">Leadership review</option>
            <option value="approved">Approved</option>
            <option value="published">Published</option>
          </select>
        </div>
        <div className="field full">
          <label htmlFor="description">Description</label>
          <textarea id="description" name="description" placeholder="Purpose and operational context..." />
        </div>
        <div className="field full">
          <label htmlFor="preparation">Member preparation</label>
          <textarea id="preparation" name="preparation" placeholder="What members must do before the event..." />
        </div>
        <div className="field full">
          <label htmlFor="rules">Rules and instructions</label>
          <textarea id="rules" name="rules" placeholder="Kingdom or alliance rules..." />
        </div>
      </div>

      {message && <div className="form-error">{message}</div>}
      {!configured && <div className="form-error">Create is disabled in demo mode. Configure Supabase to enable write actions.</div>}

      <div className="actions">
        <button className="button primary" disabled={!configured || saving} type="submit">
          {saving ? "Creating…" : "Create event"}
        </button>
        <button className="button" type="button" onClick={() => router.back()}>Cancel</button>
      </div>
    </form>
  );
}
