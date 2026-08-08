import assert from "node:assert/strict";
import test from "node:test";
import { buildPredictions, predictionMatchesEvent } from "../lib/event-prediction.ts";

test("generates repeatable Kingdom 4126 events inside the rolling window", () => {
  const predictions = buildPredictions({
    from: new Date("2026-08-03T00:00:00Z"),
    through: new Date("2026-08-25T00:00:00Z")
  });

  assert.ok(predictions.some((event) =>
    event.name === "The Mightiest Governor"
    && event.start_at === "2026-08-10T00:00:00.000Z"
    && event.end_at === "2026-08-16T00:00:00.000Z"
  ));
  assert.ok(predictions.some((event) =>
    event.name === "Wheel of Fortune"
    && event.start_at === "2026-08-11T00:00:00.000Z"
  ));
  assert.equal(predictions.some((event) => event.name.includes("Ark of Osiris")), false);
  assert.ok(predictions.every((event) => event.certainty === "predicted"));
});

test("does not duplicate an overlapping confirmed event with a different import key", () => {
  const predictions = buildPredictions({
    from: new Date("2026-08-03T00:00:00Z"),
    through: new Date("2026-08-12T00:00:00Z"),
    existingEvents: [{
      name: "Mightiest Governor Event",
      start_at: "2026-08-10T00:00:00Z",
      end_at: "2026-08-16T00:00:00Z",
      import_key: "confirmed:screenshot:mge:2026-08-10"
    }]
  });

  assert.equal(predictions.some((event) => event.name === "The Mightiest Governor"), false);
});

test("matches stable prediction keys even when display text changes", () => {
  const candidate = buildPredictions({
    from: new Date("2026-08-10T00:00:00Z"),
    through: new Date("2026-08-10T00:00:00Z")
  }).find((event) => event.name === "The Mightiest Governor");

  assert.ok(candidate);
  assert.equal(predictionMatchesEvent(candidate, {
    name: "Renamed Event",
    start_at: "2030-01-01T00:00:00Z",
    end_at: "2030-01-02T00:00:00Z",
    import_key: candidate.import_key
  }), true);
});
