import type { Announcement, EventTemplate, RokEvent } from "@/lib/types";

export const demoEvents: RokEvent[] = [
  {
    id: "demo-mge-1",
    name: "The Mightiest Governor",
    slug: "mge-august-3",
    description: "Kingdom-wide six-day competition. Commander and stage rules pending council confirmation.",
    category: "Competitive",
    scope: "kingdom",
    status: "review",
    certainty: "predicted",
    start_at: "2026-08-03T00:00:00Z",
    end_at: "2026-08-09T00:00:00Z",
    announcement_deadline: "2026-07-31T00:00:00Z",
    owner_name: "Drunstan",
    rules: "Rank reservations and Kill Event caps require council approval.",
    preparation: "Save training, research, building speedups, AP, and gathering boosts."
  },
  {
    id: "demo-ark-1",
    name: "Ark of Osiris — 126V",
    slug: "ark-126v-august-8",
    description: "Alliance Ark match window.",
    category: "Alliance PvP",
    scope: "alliance",
    status: "approved",
    certainty: "leadership_scheduled",
    start_at: "2026-08-08T19:00:00Z",
    end_at: "2026-08-08T20:00:00Z",
    registration_deadline: "2026-08-06T23:59:00Z",
    announcement_deadline: "2026-08-01T19:00:00Z",
    owner_name: "Alliance Ark Lead",
    alliance_name: "Valkania Syndicate [126V]",
    preparation: "Confirm roster, voice attendance, equipment, presets, and teleports."
  },
  {
    id: "demo-dark-fortress",
    name: "Dark Fortress Raid — 126V",
    slug: "dark-fortress-126v-august-9",
    description: "Collect Raid Coins and coordinate rallies to maximize total alliance damage.",
    category: "Alliance Raid",
    scope: "alliance",
    status: "published",
    certainty: "leadership_scheduled",
    start_at: "2026-08-09T19:00:00Z",
    end_at: "2026-08-09T20:00:00Z",
    preparation_deadline: "2026-08-09T17:00:00Z",
    owner_name: "Drunstan",
    alliance_name: "Valkania Syndicate [126V]",
    rules: "Only designated rally leaders launch. Join the requested troop-type rallies.",
    preparation: "Defeat barbarians, earn Raid Coins, and donate them through the event page."
  },
  {
    id: "demo-wheel",
    name: "Wheel of Fortune",
    slug: "wheel-august-11",
    description: "Commander wheel. Featured commander must be verified in-game.",
    category: "Commander",
    scope: "kingdom",
    status: "draft",
    certainty: "predicted",
    start_at: "2026-08-11T00:00:00Z",
    end_at: "2026-08-14T00:00:00Z",
    owner_name: "Drunstan",
    preparation: "Save gems and decide whether to use free, discounted, 10-spin, or milestone spins."
  },
  {
    id: "demo-guardians",
    name: "Kingdom Guardian Rotation",
    slug: "guardian-rotation",
    description: "Protected kingdom guardian time.",
    category: "Kingdom Routine",
    scope: "kingdom",
    status: "approved",
    certainty: "leadership_scheduled",
    start_at: "2026-07-31T00:05:00Z",
    end_at: "2026-07-31T00:45:00Z",
    owner_name: "Guardian Lead",
    rules: "Do not hit guardians before the protected start call."
  },
  {
    id: "demo-qixi",
    name: "Night of Sevens Event Series",
    slug: "night-of-sevens",
    description: "Qixi event series. Individual event dates await the in-game calendar.",
    category: "Special Series",
    scope: "kingdom",
    status: "draft",
    certainty: "tbd",
    start_at: "2026-08-01T00:00:00Z",
    end_at: "2026-08-15T00:00:00Z",
    owner_name: "Drunstan",
    preparation: "Capture screenshots of the in-game event calendar after the update."
  }
];

export const demoTemplates: EventTemplate[] = [
  {
    id: "template-mge",
    name: "Mightiest Governor",
    category: "Competitive",
    default_scope: "kingdom",
    description: "Six-day kingdom competition with stage-specific rules and announcements.",
    preparation: "Save speedups, AP, resources, gathering boosts, and hospital capacity.",
    default_rules: "Publish placements, point caps, and Kill Event rules before the event.",
    reminder_offsets_minutes: [10080, 1440, 60],
    is_active: true
  },
  {
    id: "template-ark",
    name: "Ark of Osiris",
    category: "Alliance PvP",
    default_scope: "alliance",
    description: "Registration, roster lock, strategy, voice, match reminders, and result reporting.",
    preparation: "Confirm roster and attendance before registration closes.",
    default_rules: "Use designated voice and follow the assigned Ark role.",
    reminder_offsets_minutes: [10080, 1440, 60, 30],
    is_active: true
  },
  {
    id: "template-dark-fortress",
    name: "Dark Fortress Raid",
    category: "Alliance Raid",
    default_scope: "alliance",
    description: "Raid Coin collection, fortress selection, rally coordination, and damage reporting.",
    preparation: "Donate Raid Coins and prepare the requested troop type.",
    default_rules: "Only assigned rally leaders launch rallies.",
    reminder_offsets_minutes: [4320, 1440, 60],
    is_active: true
  },
  {
    id: "template-shadow-legion",
    name: "Shadow Legion",
    category: "Alliance Defense",
    default_scope: "alliance",
    description: "Alliance-selected defense window with reinforcement and offline-member planning.",
    preparation: "Return to alliance territory and prepare city garrison commanders.",
    default_rules: "Reinforce assigned offline cities and do not start outside the approved window.",
    reminder_offsets_minutes: [1440, 120, 30],
    is_active: true
  },
  {
    id: "template-guardian",
    name: "Guardian Rotation",
    category: "Kingdom Routine",
    default_scope: "kingdom",
    description: "Protected kingdom guardian schedule.",
    preparation: "Arrive before the start call.",
    default_rules: "No early hits. Follow alliance or rotation assignments.",
    reminder_offsets_minutes: [60, 15],
    is_active: true
  }
];

export const demoAnnouncements: Announcement[] = [
  {
    id: "announcement-dark-fortress",
    event_id: "demo-dark-fortress",
    channel: "discord",
    title: "Dark Fortress Raid — 126V",
    body: "Dark Fortress Raid is scheduled for August 9 at 19:00 UTC. Donate Raid Coins and be ready to join designated rallies.",
    status: "approved",
    scheduled_at: "2026-08-08T19:00:00Z",
    published_at: null
  }
];
