import type { RokEvent } from "./types";

export type PredictionConfidence = "high" | "medium_high" | "medium";

export type PredictionRule = {
  key: string;
  name: string;
  category: string;
  anchorStartAt: string;
  intervalDays: number;
  durationDays: number;
  confidence: PredictionConfidence;
  description: string;
  preparation: string;
  anchorSource: string;
};

export type PredictionCandidate = {
  import_key: string;
  name: string;
  category: string;
  scope: "kingdom";
  certainty: "predicted";
  start_at: string;
  end_at: string;
  description: string;
  preparation: string;
  source_ref: string;
  source_details: Record<string, unknown>;
};

const DAY_MS = 86_400_000;

/**
 * Rolling rules anchored to Kingdom 4126's August 2026 in-game calendar.
 * Only repeatable events belong here. Irregular events remain manual/TBD.
 */
export const KINGDOM_4126_RULES: PredictionRule[] = [
  {
    key: "mightiest-governor",
    name: "The Mightiest Governor",
    category: "Ranking Event",
    anchorStartAt: "2026-08-10T00:00:00Z",
    intervalDays: 14,
    durationDays: 6,
    confidence: "high",
    description: "Six-stage kingdom ranking event generated from the Kingdom 4126 rotation.",
    preparation: "Confirm the commander, placements, point caps, and kill-event rules before publishing.",
    anchorSource: "Kingdom 4126 in-game countdown captured 2026-08-03"
  },
  {
    key: "wheel-of-fortune",
    name: "Wheel of Fortune",
    category: "Commander Event",
    anchorStartAt: "2026-08-11T00:00:00Z",
    intervalDays: 14,
    durationDays: 3,
    confidence: "high",
    description: "Commander wheel aligned to the Kingdom 4126 Mightiest Governor week.",
    preparation: "Save gems and verify the featured commander in-game before publishing.",
    anchorSource: "Derived from the confirmed Kingdom 4126 MGE rotation"
  },
  {
    key: "esmeralda",
    name: "Esmeralda's Prayer",
    category: "Equipment Event",
    anchorStartAt: "2026-08-10T00:00:00Z",
    intervalDays: 14,
    durationDays: 2,
    confidence: "medium",
    description: "Equipment event commonly aligned with the Mightiest Governor week.",
    preparation: "Verify availability and rewards in-game before spending gems or materials.",
    anchorSource: "Aligned to the Kingdom 4126 MGE anchor"
  },
  {
    key: "hunt-for-history",
    name: "Hunt for History",
    category: "Equipment Event",
    anchorStartAt: "2026-08-07T00:00:00Z",
    intervalDays: 14,
    durationDays: 2,
    confidence: "medium",
    description: "Equipment egg event predicted for the alternate Ark rotation week.",
    preparation: "Verify the event in-game before spending gems or hammers.",
    anchorSource: "Aligned to the Kingdom 4126 Ark rotation"
  }
];

function normalizeName(name: string) {
  const value = name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (value.includes("mightiest governor")) return "mightiest-governor";
  if (value.includes("wheel of fortune")) return "wheel-of-fortune";
  if (value.includes("esmeralda")) return "esmeralda";
  if (value.includes("hunt for history") || value.includes("egg event")) return "hunt-for-history";
  return value.replaceAll(" ", "-");
}

function intervalsOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return Date.parse(aStart) < Date.parse(bEnd) && Date.parse(bStart) < Date.parse(aEnd);
}

export function predictionMatchesEvent(candidate: PredictionCandidate, event: Pick<RokEvent,
  "name" | "start_at" | "end_at" | "import_key"
>) {
  if (event.import_key === candidate.import_key) return true;
  return normalizeName(event.name) === normalizeName(candidate.name)
    && intervalsOverlap(candidate.start_at, candidate.end_at, event.start_at, event.end_at);
}

export function buildPredictions({
  from,
  through,
  existingEvents = [],
  rules = KINGDOM_4126_RULES
}: {
  from: Date;
  through: Date;
  existingEvents?: Array<Pick<RokEvent, "name" | "start_at" | "end_at" | "import_key">>;
  rules?: PredictionRule[];
}) {
  const fromMs = from.getTime();
  const throughMs = through.getTime();
  const candidates: PredictionCandidate[] = [];

  for (const rule of rules) {
    const anchorMs = Date.parse(rule.anchorStartAt);
    const intervalMs = rule.intervalDays * DAY_MS;
    let occurrence = Math.max(0, Math.floor((fromMs - anchorMs) / intervalMs));
    let startMs = anchorMs + occurrence * intervalMs;
    while (startMs < fromMs) {
      occurrence += 1;
      startMs += intervalMs;
    }

    while (startMs <= throughMs) {
      const startAt = new Date(startMs).toISOString();
      const endAt = new Date(startMs + rule.durationDays * DAY_MS).toISOString();
      const dateKey = startAt.slice(0, 10);
      const candidate: PredictionCandidate = {
        import_key: `prediction:rok-4126:${rule.key}:${dateKey}`,
        name: rule.name,
        category: rule.category,
        scope: "kingdom",
        certainty: "predicted",
        start_at: startAt,
        end_at: endAt,
        description: rule.description,
        preparation: rule.preparation,
        source_ref: rule.anchorSource,
        source_details: {
          prediction_rule: rule.key,
          interval_days: rule.intervalDays,
          duration_days: rule.durationDays,
          confidence: rule.confidence,
          anchor_start_at: rule.anchorStartAt,
          generated_from_kingdom: 4126
        }
      };

      if (!existingEvents.some((event) => predictionMatchesEvent(candidate, event))) {
        candidates.push(candidate);
      }

      startMs += intervalMs;
    }
  }

  return candidates.sort((a, b) => a.start_at.localeCompare(b.start_at));
}
