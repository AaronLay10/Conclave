"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarPlus, Check, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import type { RokEvent } from "@/lib/types";
import { formatUtc } from "@/lib/utils";

function confidenceLabel(event: RokEvent) {
  const confidence = event.source_details?.confidence;
  if (typeof confidence !== "string") return "Rotation prediction";
  return `${confidence.replaceAll("_", "–")} confidence`;
}

export function PredictionReview({ predictions }: { predictions: RokEvent[] }) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setGenerating(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/events/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ horizon_days: 90 })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Predictions could not be generated.");
      setMessage(data.inserted > 0
        ? `Added ${data.inserted} predictions through ${new Date(data.through).toISOString().slice(0, 10)}.`
        : "The next 90 days are already covered; no duplicates were added.");
      router.refresh();
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Predictions could not be generated.");
    } finally {
      setGenerating(false);
    }
  }

  async function confirm(id: string) {
    setConfirming(id);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/events/${id}/confirm`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "The prediction could not be confirmed.");
      setMessage(`${data.event.name} is now confirmed.`);
      router.refresh();
    } catch (confirmationError) {
      setError(confirmationError instanceof Error ? confirmationError.message : "The prediction could not be confirmed.");
    } finally {
      setConfirming(null);
    }
  }

  return (
    <div className="stack">
      <div className="card prediction-summary">
        <div>
          <div className="row"><CalendarPlus size={20} /><strong>90-day rolling window</strong></div>
          <p className="muted">Generate only repeatable rotation events. Existing confirmed or overlapping events are preserved.</p>
        </div>
        <button className="button primary" onClick={generate} disabled={generating}>
          <RefreshCw size={17} className={generating ? "spin" : ""} />
          {generating ? "Generating…" : "Generate next 90 days"}
        </button>
      </div>

      {message && <div className="form-success" role="status">{message}</div>}
      {error && <div className="form-error" role="alert">{error}</div>}

      <div className="card">
        <div className="card-header">
          <div>
            <strong>Prediction review queue</strong>
            <div><small>{predictions.length} awaiting in-game confirmation</small></div>
          </div>
          <span className="badge predicted">Predicted</span>
        </div>
        {predictions.length === 0 ? (
          <div className="empty">
            <ShieldCheck size={30} />
            <p>No predictions need review. Generate the next rolling window when you are ready.</p>
          </div>
        ) : (
          <div className="prediction-list">
            {predictions.map((event) => (
              <article className="prediction-item" key={event.id}>
                <div className="prediction-main">
                  <div className="row prediction-title">
                    <h3>{event.name}</h3>
                    <StatusBadge value={event.certainty} />
                  </div>
                  <div className="prediction-time">{formatUtc(event.start_at)} → {formatUtc(event.end_at)}</div>
                  <div className="event-meta">{confidenceLabel(event)} · {event.source_ref ?? "Kingdom 4126 rotation"}</div>
                  {event.description && <p>{event.description}</p>}
                </div>
                <div className="prediction-actions">
                  <button
                    className="button primary"
                    onClick={() => confirm(event.id)}
                    disabled={confirming === event.id}
                    title="Use after the dates are visible in-game"
                  >
                    <Check size={16} /> {confirming === event.id ? "Confirming…" : "Confirm dates"}
                  </button>
                  <Link className="button" href={`/events/${event.id}/edit`}>
                    <ExternalLink size={16} /> Review or correct
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
