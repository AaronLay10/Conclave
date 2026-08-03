import type { RokEvent } from "@/lib/types";
import { formatUtc } from "@/lib/utils";

const GOLD = "#855400";
const GREEN = "#176B3A";
const BLUE = "#1E5F8A";
const ORANGE = "#963F00";

type EventInstruction = {
  key: string;
  aliases: string[];
  dailySummary: string;
  announcement: (event: RokEvent) => string;
};

function safeMailText(value: string) {
  return value.replace(/[<>]/g, "").trim();
}

function title(value: string) {
  return `<size=34><b><color=${GOLD}>${safeMailText(value)}</color></b></size>`;
}

function heading(value: string) {
  return `<size=27><b><color=${GREEN}>${safeMailText(value)}</color></b></size>`;
}

function warning(value: string) {
  return `<b><color=${ORANGE}>${safeMailText(value)}</color></b>`;
}

function eventWindow(event: RokEvent) {
  return `<color=${BLUE}>${formatUtc(event.start_at)} — ${formatUtc(event.end_at)}</color>`;
}

function leadershipInstructions(event: RokEvent) {
  const instructions = [event.preparation, event.rules]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  if (instructions.length === 0) return "";
  return `\n\n${heading("LEADERSHIP INSTRUCTIONS")}\n${instructions.map(safeMailText).join("\n")}`;
}

function compose(...parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join("\n\n");
}

const EVENT_INSTRUCTIONS: EventInstruction[] = [
  {
    key: "king-of-the-tribes",
    aliases: ["king of the tribes"],
    dailySummary:
      "Join alliance rallies against Barbarian Forts. Fill every rally with as many members as possible and defeat the highest reliable fort level to increase our alliance score.",
    announcement: (event) => compose(
      title("KING OF THE TRIBES"),
      eventWindow(event),
      heading("RALLY THE ALLIANCE"),
      "Start or join alliance rallies against Barbarian Forts. Fill every rally with as many alliance members as possible—more participants increase the points earned for our alliance.",
      "Attack the highest fort level your rally can defeat reliably. Keep rallies moving throughout the event so we can reach every alliance milestone and improve our final ranking.",
      warning("IMPORTANT"),
      "You must be in the alliance to participate. Follow any rally limits or fort-level instructions issued by alliance leadership.",
      leadershipInstructions(event)
    )
  },
  {
    key: "mercantile-melee",
    aliases: ["mercantile melee"],
    dailySummary:
      "Apply to join the Alliance Caravan during preparation and configure your strongest available lineup. Follow the Caravan Captain's instructions and collect your rewards after the caravan arrives.",
    announcement: (event) => compose(
      title("MERCANTILE MELEE"),
      eventWindow(event),
      heading("JOIN THE CARAVAN"),
      "Apply to join the Alliance Caravan during the preparation phase and configure the strongest lineup available to you. Follow the Caravan Captain's lineup and participation instructions.",
      "Governors must have been in the alliance for at least 8 hours to apply. The appointed Caravan Captain must have been in the alliance for at least 24 hours.",
      warning("BE READY BEFORE DEPARTURE"),
      "Complete your setup before preparation ends. Personal Caravan rewards will be delivered automatically by in-game mail after the caravan reaches its destination.",
      leadershipInstructions(event)
    )
  },
  {
    key: "mighty-army",
    aliases: ["mighty army"],
    dailySummary:
      "Train 10,000 troops and defeat 30 Barbarians today. Claim every completed milestone before the daily reset at 00:00 UTC.",
    announcement: (event) => compose(
      title("MIGHTY ARMY"),
      eventWindow(event),
      heading("DAILY OBJECTIVES"),
      "Train 10,000 troops and defeat 30 Barbarians every day. Rewards unlock at the intermediate training and Barbarian milestones, so claim each completed objective as you progress.",
      "Training milestones: 4,000 • 6,000 • 10,000\nBarbarian milestones: 5 • 10 • 15 • 30",
      warning("CLAIM BEFORE RESET"),
      "Progress resets daily at 00:00 UTC. Claim all completed rewards before reset because unfinished daily progress does not carry forward.",
      leadershipInstructions(event)
    )
  },
  {
    key: "dark-fortress-raid",
    aliases: ["dark fortress raid"],
    dailySummary:
      "Join the scheduled alliance rallies against the Dark Fortress and follow the rally leaders' troop instructions. Enable offline participation when available so your troops can join nearby rallies automatically.",
    announcement: (event) => compose(
      title("DARK FORTRESS RAID"),
      eventWindow(event),
      heading("ASSEMBLE FOR THE RAID"),
      "Be ready before the scheduled start and join alliance rallies attacking the Dark Fortress. Keep filling rallies until the raid ends to maximize participation and rewards.",
      "Follow the assigned rally leaders, troop types, and march instructions.",
      warning("CAN'T STAY ONLINE?"),
      "Enable offline participation when the option is available. Eligible offline governors can automatically join nearby Dark Fortress rallies during the battle or within 15 minutes before it begins.",
      leadershipInstructions(event)
    )
  },
  {
    key: "the-golden-kingdom",
    aliases: ["the golden kingdom", "golden kingdom"],
    dailySummary:
      "Choose five strong armies, clear the fog, and defeat each Guardian Chief. Avoid unnecessary fights, protect your army health, and save healing and powerful relics for the later floors.",
    announcement: (event) => compose(
      title("THE GOLDEN KINGDOM"),
      eventWindow(event),
      heading("ENTER PREPARED"),
      "Choose five strong armies before entering. Your commanders, talents, and equipment cannot be changed after the event begins, so include durable front-line armies plus strong area-damage and support commanders.",
      "Clear the fog, destroy dangerous Arrow Towers, and defeat each Guardian Chief to advance. Avoid unnecessary battles because army health carries between fights.",
      warning("SAVE POWER FOR LATER"),
      "Preserve healing, powerful relics, and Karaku Gold for the harder later floors. Checkpoint rewards are earned after every fourth completed floor.",
      leadershipInstructions(event)
    )
  },
  {
    key: "warpath",
    aliases: ["warpath"],
    dailySummary:
      "Train 2,000 Tier 2+ units of every troop type and reach 10,000 total trained units today. Claim all completed rewards before the 00:00 UTC reset.",
    announcement: (event) => compose(
      title("WARPATH"),
      eventWindow(event),
      heading("TRAIN EVERY TROOP TYPE"),
      "Complete all daily training objectives:\n• 2,000 Tier 2+ Infantry\n• 2,000 Tier 2+ Archers\n• 2,000 Tier 2+ Cavalry\n• 2,000 Tier 2+ Siege\n• 10,000 total Tier 2+ units",
      warning("CLAIM BEFORE RESET"),
      "All missions reset daily at 00:00 UTC. Claim every completed reward before reset so your progress and rewards are not lost.",
      leadershipInstructions(event)
    )
  }
];

function normalizeEventName(value: string) {
  return value
    .toLowerCase()
    .replace(/[—–-].*$/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function eventInstructionFor(event: Pick<RokEvent, "name">) {
  const normalized = normalizeEventName(event.name);
  return EVENT_INSTRUCTIONS.find((instruction) =>
    instruction.aliases.some((alias) => normalized === alias || normalized.startsWith(`${alias} `))
  );
}

export function dailyMailSummaryForEvent(event: Pick<RokEvent, "name">) {
  return eventInstructionFor(event)?.dailySummary ?? null;
}

export function singleEventMailForEvent(event: RokEvent) {
  return eventInstructionFor(event)?.announcement(event) ?? null;
}

