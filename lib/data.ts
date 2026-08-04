import { demoAnnouncements, demoEvents, demoTemplates } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { ActivityMemberScore, ActivityScoreConfig, ActivitySnapshot, Announcement, EventTemplate, RokEvent } from "@/lib/types";

export async function getEvents(): Promise<RokEvent[]> {
  if (!isSupabaseConfigured()) return demoEvents;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("start_at", { ascending: true });

  if (error) throw new Error(`Unable to load events: ${error.message}`);
  return (data ?? []) as RokEvent[];
}

export async function getEvent(id: string): Promise<RokEvent | null> {
  if (!isSupabaseConfigured()) {
    return demoEvents.find((event) => event.id === id) ?? null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Unable to load event: ${error.message}`);
  return data as RokEvent | null;
}

export async function getTemplates(): Promise<EventTemplate[]> {
  if (!isSupabaseConfigured()) return demoTemplates;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_templates")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(`Unable to load templates: ${error.message}`);
  return (data ?? []) as EventTemplate[];
}

export async function getAnnouncements(): Promise<Announcement[]> {
  if (!isSupabaseConfigured()) return demoAnnouncements;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Unable to load announcements: ${error.message}`);
  return (data ?? []) as Announcement[];
}

export async function getLatestActivitySnapshot(): Promise<ActivitySnapshot | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data: activityImport, error: importError } = await supabase
    .from("activity_imports")
    .select("*, alliances(name, tag)")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (importError) throw new Error(`Unable to load activity: ${importError.message}`);
  if (!activityImport) return null;

  const { data: members, error: membersError } = await supabase
    .from("activity_member_scores")
    .select("*")
    .eq("import_id", activityImport.id)
    .order("rank", { ascending: true });

  if (membersError) throw new Error(`Unable to load activity scores: ${membersError.message}`);
  const alliance = activityImport.alliances as unknown as { name: string; tag: string } | null;

  return {
    id: activityImport.id,
    alliance_tag: alliance?.tag ?? "",
    alliance_name: alliance?.name ?? "Alliance",
    activity_period_start: activityImport.activity_period_start,
    activity_period_end: activityImport.activity_period_end,
    fort_period_start: activityImport.fort_period_start,
    fort_period_end: activityImport.fort_period_end,
    activity_source_name: activityImport.activity_source_name,
    fort_source_name: activityImport.fort_source_name,
    score_config: activityImport.score_config as ActivityScoreConfig,
    created_at: activityImport.created_at,
    members: (members ?? []) as ActivityMemberScore[]
  };
}

export async function getCurrentUser() {
  if (!isSupabaseConfigured()) {
    return {
      id: "demo-user",
      email: "demo@rok.events",
      user_metadata: { full_name: "Drunstan", avatar_url: null }
    };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user;
}
