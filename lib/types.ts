export type EventScope = "kingdom" | "alliance";
export type EventStatus =
  | "draft"
  | "review"
  | "approved"
  | "published"
  | "active"
  | "completed"
  | "archived";
export type EventCertainty =
  | "confirmed"
  | "predicted"
  | "leadership_scheduled"
  | "tbd";

export interface RokEvent {
  id: string;
  kingdom_id?: string | null;
  alliance_id?: string | null;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  scope: EventScope;
  status: EventStatus;
  certainty: EventCertainty;
  start_at: string;
  end_at: string;
  preparation_deadline?: string | null;
  registration_deadline?: string | null;
  announcement_deadline?: string | null;
  owner_id?: string | null;
  owner_name?: string | null;
  alliance_name?: string | null;
  rules?: string | null;
  preparation?: string | null;
  location?: string | null;
  import_key?: string | null;
  source_kind?: "manual" | "ingame_screenshot" | "official" | "prediction";
  source_ref?: string | null;
  source_details?: Record<string, unknown>;
  imported_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface EventTemplate {
  id: string;
  name: string;
  category: string;
  default_scope: EventScope;
  description: string | null;
  preparation: string | null;
  default_rules: string | null;
  reminder_offsets_minutes: number[];
  is_active: boolean;
}

export interface Announcement {
  id: string;
  event_id: string;
  channel: "discord" | "ingame_mail" | "leadership";
  title: string;
  body: string;
  status: "draft" | "approved" | "scheduled" | "published" | "failed";
  scheduled_at: string | null;
  published_at: string | null;
}

export type ActivityTier = "Exceptional" | "Strong" | "Active" | "Light" | "At Risk";

export interface ActivityScoreConfig {
  weights: {
    building: number;
    tech: number;
    resources: number;
    helps: number;
    forts: number;
  };
  targets: {
    building: number;
    tech: number;
    resources: number;
    helps: number;
    fortPointsPerWeek: number;
  };
  fortWeeks: number;
}

export interface ActivityMemberScore {
  governor_id: string;
  governor_name: string;
  building_points: number;
  tech_donations: number;
  resource_assistance: number;
  helps_given: number;
  fort_points: number;
  fort_points_per_week: number;
  launches: number;
  joins: number;
  building_score: number;
  tech_score: number;
  resource_score: number;
  helps_score: number;
  fort_score: number;
  activity_score: number;
  tier: ActivityTier;
  rank: number;
  data_note: string | null;
}

export interface ActivitySnapshot {
  id: string;
  alliance_id: string;
  alliance_tag: string;
  alliance_name: string;
  activity_period_start: string;
  activity_period_end: string;
  fort_period_start: string;
  fort_period_end: string;
  activity_source_name: string;
  fort_source_name: string;
  score_config: ActivityScoreConfig;
  created_at: string;
  members: ActivityMemberScore[];
}
