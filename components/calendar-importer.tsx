"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileJson, Upload } from "lucide-react";
import { z } from "zod";

const certaintySchema = z.enum([
  "confirmed",
  "predicted",
  "leadership_scheduled",
  "tbd"
]);

const utcTimestamp = z.string().datetime({ offset: true }).refine(
  (value) => value.endsWith("Z"),
  "Use an explicit UTC timestamp ending in Z."
);

const previewEventSchema = z.object({
  import_key: z.string().min(3).max(180).regex(/^[a-z0-9][a-z0-9._:-]*$/),
  name: z.string().min(3).max(120),
  category: z.string().min(2).max(80),
  scope: z.enum(["kingdom", "alliance"]),
  alliance_tag: z.string().min(1).max(20).optional(),
  certainty: certaintySchema,
  start_at: utcTimestamp,
  end_at: utcTimestamp,
  source_ref: z.string().min(1).max(500)
}).passthrough().superRefine((event, context) => {
  if (Date.parse(event.end_at) <= Date.parse(event.start_at)) {
    context.addIssue({
      code: "custom",
      path: ["end_at"],
      message: "End time must be after start time."
    });
  }

  if (event.scope === "alliance" && !event.alliance_tag) {
    context.addIssue({
      code: "custom",
      path: ["alliance_tag"],
      message: "Alliance events require alliance_tag."
    });
  }
});

const importBatchSchema = z.object({
  batch_name: z.string().min(3).max(120),
  replace_existing: z.boolean().optional(),
  events: z.array(previewEventSchema).min(1).max(100)
});

type PreviewEvent = z.infer<typeof previewEventSchema>;
type ImportBatch = z.infer<typeof importBatchSchema>;

const starterBatch: ImportBatch = {
  batch_name: "Kingdom 4126 — August 2026 in-game calendar",
  replace_existing: true,
  events: []
};

function displayUtc(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function formatValidationError(error: z.ZodError) {
  const issue = error.issues[0];
  if (!issue) return "Invalid calendar import file.";

  const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
  return `${path}${issue.message}`;
}

export function CalendarImporter() {
  const [raw, setRaw] = useState(JSON.stringify(starterBatch, null, 2));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const parsed = useMemo(() => {
    try {
      const json = JSON.parse(raw);
      const validated = importBatchSchema.safeParse(json);

      if (!validated.success) {
        return { value: null, error: formatValidationError(validated.error) };
      }

      return { value: validated.data, error: null };
    } catch (parseError) {
      return {
        value: null,
        error: parseError instanceof Error ? parseError.message : "Invalid JSON."
      };
    }
  }, [raw]);

  async function loadFile(file?: File) {
    if (!file) return;
    setRaw(await file.text());
    setError(null);
    setResult(null);
  }

  async function importEvents() {
    if (!parsed.value || parsed.value.events.length === 0) return;
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/events/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...parsed.value, replace_existing: true })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "The import failed.");
      setResult(`Imported ${data.inserted}, updated ${data.updated}, skipped ${data.skipped}.`);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "The import failed.");
    } finally {
      setSubmitting(false);
    }
  }

  const events: PreviewEvent[] = parsed.value?.events ?? [];

  return (
    <div className="stack">
      <div className="card">
        <div className="card-header">
          <div className="row"><FileJson size={18} /><strong>Import file</strong></div>
          <small>JSON · maximum 100 events</small>
        </div>
        <div className="card-body form">
          <div className="import-guidance">
            <CheckCircle2 size={18} />
            <div>
              <strong>Matching events always update</strong>
              <p>Stable import keys prevent duplicates. A new screenshot import replaces matching event dates, certainty, and source details automatically.</p>
            </div>
          </div>

          <div className="field">
            <label htmlFor="calendar-file">Choose a prepared calendar file</label>
            <input
              id="calendar-file"
              type="file"
              accept="application/json,.json"
              onChange={(event) => loadFile(event.target.files?.[0])}
            />
          </div>

          <div className="field">
            <label htmlFor="calendar-json">Or review and paste JSON</label>
            <textarea
              id="calendar-json"
              className="import-json"
              value={raw}
              onChange={(event) => setRaw(event.target.value)}
              spellCheck={false}
            />
          </div>

          {parsed.error && <div className="form-error">{parsed.error}</div>}
          {error && <div className="form-error">{error}</div>}
          {result && <div className="form-success">{result}</div>}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <strong>Preview · {events.length} events</strong>
          <button
            className="button primary"
            disabled={submitting || Boolean(parsed.error) || events.length === 0}
            onClick={importEvents}
          >
            <Upload size={17} /> {submitting ? "Updating…" : "Update calendar events"}
          </button>
        </div>
        {events.length === 0 ? (
          <div className="empty">Add reviewed screenshot events to the file to preview them here.</div>
        ) : (
          <div className="import-preview">
            {events.map((event, index) => {
              const uncertain = event.certainty !== "confirmed";
              return (
                <div className="event-row" key={`${event.import_key}-${index}`}>
                  <div>
                    <div className="event-name">{event.name}</div>
                    <div className="event-meta">{event.import_key}</div>
                  </div>
                  <div>
                    <div>{displayUtc(event.start_at)}</div>
                    <div className="event-meta">to {displayUtc(event.end_at)}</div>
                  </div>
                  <span className={`badge ${event.certainty}`}>
                    {uncertain && <AlertTriangle size={12} />}{event.certainty.replaceAll("_", " ")}
                  </span>
                  <div className="event-meta">{event.source_ref}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
