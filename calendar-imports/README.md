# Calendar import files

Calendar imports are evidence-backed JSON files prepared from the Rise of
Kingdoms in-game calendar. Import them from **Events → Calendar Import** after
applying migration `0005_calendar_import_provenance.sql`.

Each event must include:

```json
{
  "import_key": "rok-4126-2026-08:event-name:2026-08-01t0000z",
  "name": "Event name exactly as shown",
  "category": "Seasonal",
  "scope": "kingdom",
  "certainty": "confirmed",
  "start_at": "2026-08-01T00:00:00Z",
  "end_at": "2026-08-04T00:00:00Z",
  "source_ref": "screenshot-01 — calendar tile and detail panel",
  "source_details": {
    "evidence": "Both boundaries visible in game",
    "review_note": "Reset-boundary end is exclusive"
  }
}
```

Rules:

- Timestamps must be UTC ISO 8601 values ending in `Z`.
- Use `confirmed` only when the in-game screenshot shows enough information to
  establish the event and its date boundary.
- Use `tbd` when a title is visible but a boundary is cropped or ambiguous.
- Use `predicted` only for schedule inference, never for screenshot evidence.
- Keep `import_key` unchanged when correcting an imported record. This is the
  duplicate-control identity for the kingdom.
- Imports enter `review` status and are not automatically published.
- Re-importing skips matching keys by default, preserving manual edits.
- Enable `replace_existing` only for a deliberate correction.
