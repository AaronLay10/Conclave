import type {
  ActivityMemberScore,
  ActivityScoreConfig,
  ActivityTier
} from "@/lib/types";

export type ActivitySourceRow = {
  governor_id: string;
  governor_name: string;
  building_points: number;
  tech_donations: number;
  resource_assistance: number;
  helps_given: number;
};

export type FortSourceRow = {
  governor_id: string;
  governor_name: string;
  adjusted_points: number;
  launches: number;
  joins: number;
  mistakes: number;
};

export const DEFAULT_ACTIVITY_SCORE_CONFIG: ActivityScoreConfig = {
  weights: {
    building: 0.15,
    tech: 0.25,
    resources: 0.1,
    helps: 0.2,
    forts: 0.3
  },
  targets: {
    building: 34_000,
    tech: 62_000,
    resources: 9_300_000,
    helps: 1_930,
    fortPointsPerWeek: 207
  },
  fortWeeks: 3
};

function numeric(value: string | undefined) {
  const parsed = Number((value ?? "0").replaceAll(",", "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];

    if (character === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(field.trim());
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(field.trim());
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  row.push(field.trim());
  if (row.some((cell) => cell.length > 0)) rows.push(row);
  return rows;
}

function requireHeaders(actual: string[], expected: string[], label: string) {
  const missing = expected.filter((header) => !actual.includes(header));
  if (missing.length > 0) {
    throw new Error(`${label} is missing: ${missing.join(", ")}.`);
  }
  return Object.fromEntries(expected.map((header) => [header, actual.indexOf(header)]));
}

export function parseActivityCsv(text: string): ActivitySourceRow[] {
  const [headers, ...rows] = parseCsv(text);
  if (!headers) throw new Error("The Activity file is empty.");
  const columns = requireHeaders(headers, [
    "Governor ID",
    "Governor Name",
    "Building Points",
    "Tech Donations",
    "Resource Assistance",
    "Helps Given"
  ], "The Activity file");

  return rows.filter((row) => row[columns["Governor ID"]]).map((row) => ({
    governor_id: row[columns["Governor ID"]],
    governor_name: row[columns["Governor Name"]] || "Unknown",
    building_points: numeric(row[columns["Building Points"]]),
    tech_donations: numeric(row[columns["Tech Donations"]]),
    resource_assistance: numeric(row[columns["Resource Assistance"]]),
    helps_given: numeric(row[columns["Helps Given"]])
  }));
}

export function parseFortsCsv(text: string): FortSourceRow[] {
  const [headers, ...rows] = parseCsv(text);
  if (!headers) throw new Error("The Forts file is empty.");
  const columns = requireHeaders(headers, [
    "Governor ID",
    "Governor Name",
    "Adjusted Points",
    "Launches",
    "Joins",
    "Mistakes"
  ], "The Forts file");

  return rows.filter((row) => row[columns["Governor ID"]]).map((row) => ({
    governor_id: row[columns["Governor ID"]],
    governor_name: row[columns["Governor Name"]] || "Unknown",
    adjusted_points: numeric(row[columns["Adjusted Points"]]),
    launches: numeric(row[columns.Launches]),
    joins: numeric(row[columns.Joins]),
    mistakes: numeric(row[columns.Mistakes])
  }));
}

function tierFor(score: number): ActivityTier {
  if (score >= 80) return "Exceptional";
  if (score >= 60) return "Strong";
  if (score >= 40) return "Active";
  if (score >= 20) return "Light";
  return "At Risk";
}

function capped(value: number, target: number) {
  return target > 0 ? Math.min(value / target, 1) : 0;
}

function logCapped(value: number, target: number) {
  return value > 0 && target > 0
    ? Math.min(Math.log1p(value) / Math.log1p(target), 1)
    : 0;
}

export function calculateActivityScores(
  activityRows: ActivitySourceRow[],
  fortRows: FortSourceRow[],
  config: ActivityScoreConfig = DEFAULT_ACTIVITY_SCORE_CONFIG
): ActivityMemberScore[] {
  const fortByGovernor = new Map(fortRows.map((row) => [row.governor_id, row]));

  const scored = activityRows.map((activity) => {
    const fort = fortByGovernor.get(activity.governor_id);
    const fortPoints = fort?.adjusted_points ?? 0;
    const fortPointsPerWeek = fortPoints / config.fortWeeks;
    const buildingScore = 100 * config.weights.building * capped(activity.building_points, config.targets.building);
    const techScore = 100 * config.weights.tech * capped(activity.tech_donations, config.targets.tech);
    const resourceScore = 100 * config.weights.resources * logCapped(activity.resource_assistance, config.targets.resources);
    const helpsScore = 100 * config.weights.helps * capped(activity.helps_given, config.targets.helps);
    const fortScore = 100 * config.weights.forts * capped(fortPointsPerWeek, config.targets.fortPointsPerWeek);
    const activityScore = buildingScore + techScore + resourceScore + helpsScore + fortScore;
    const noRecordedActivity = activity.tech_donations === 0 && activity.helps_given === 0 && activity.building_points === 0 && fortPoints === 0;

    return {
      governor_id: activity.governor_id,
      governor_name: activity.governor_name,
      building_points: activity.building_points,
      tech_donations: activity.tech_donations,
      resource_assistance: activity.resource_assistance,
      helps_given: activity.helps_given,
      fort_points: fortPoints,
      fort_points_per_week: fortPointsPerWeek,
      launches: fort?.launches ?? 0,
      joins: fort?.joins ?? 0,
      building_score: buildingScore,
      tech_score: techScore,
      resource_score: resourceScore,
      helps_score: helpsScore,
      fort_score: fortScore,
      activity_score: activityScore,
      tier: tierFor(activityScore),
      rank: 0,
      data_note: noRecordedActivity
        ? "No recorded activity"
        : fortPoints === 0
          ? "No fort record"
          : activity.building_points === 0
            ? "No building points"
            : null
    } satisfies ActivityMemberScore;
  });

  return scored
    .sort((left, right) => right.activity_score - left.activity_score || left.governor_name.localeCompare(right.governor_name))
    .map((member, index) => ({ ...member, rank: index + 1 }));
}
