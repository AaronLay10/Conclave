"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteEventButton({
  eventId,
  eventName
}: {
  eventId: string;
  eventName: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function deleteEvent() {
    const confirmed = window.confirm(
      `Delete “${eventName}”?\n\nThis permanently removes the event and its announcements, reminders, alliance confirmations, and recorded results. This cannot be undone.`
    );

    if (!confirmed) return;

    setDeleting(true);
    setError("");

    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: "DELETE"
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to delete the event.");
      }

      router.push("/events");
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete the event."
      );
      setDeleting(false);
    }
  }

  return (
    <div>
      <button
        className="button danger"
        type="button"
        onClick={deleteEvent}
        disabled={deleting}
      >
        <Trash2 size={16} />
        {deleting ? "Deleting…" : "Delete event"}
      </button>
      {error && (
        <div className="form-error" style={{ marginTop: 8, maxWidth: 320 }}>
          {error}
        </div>
      )}
    </div>
  );
}
