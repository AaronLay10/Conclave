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
