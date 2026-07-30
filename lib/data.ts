import { demoAnnouncements, demoEvents, demoTemplates } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Announcement, EventTemplate, RokEvent } from "@/lib/types";

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
