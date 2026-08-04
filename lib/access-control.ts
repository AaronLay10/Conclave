export type AppRole = "event_director" | "council" | "alliance_lead" | "viewer";

export const roleLabels: Record<AppRole, string> = {
  event_director: "Event Director",
  council: "Kingdom Council",
  alliance_lead: "Alliance Leadership",
  viewer: "Viewer"
};

const allRoles: AppRole[] = ["event_director", "council", "alliance_lead", "viewer"];
const leadershipRoles: AppRole[] = ["event_director", "council", "alliance_lead"];

const pageRules: Array<{ matches: (pathname: string) => boolean; roles: AppRole[] }> = [
  { matches: (path) => path === "/settings" || path.startsWith("/settings/"), roles: ["event_director"] },
  { matches: (path) => path === "/predictions" || path.startsWith("/predictions/"), roles: ["event_director"] },
  { matches: (path) => path === "/events/import" || path.startsWith("/events/import/"), roles: ["event_director"] },
  { matches: (path) => path === "/events/new" || /\/events\/[^/]+\/edit(?:\/|$)/.test(path), roles: ["event_director"] },
  { matches: (path) => path === "/activity" || path.startsWith("/activity/"), roles: leadershipRoles },
  { matches: (path) => path === "/announcements" || path.startsWith("/announcements/"), roles: leadershipRoles },
  { matches: (path) => path === "/templates" || path.startsWith("/templates/"), roles: ["event_director", "council"] },
  { matches: (path) => path === "/dashboard" || path.startsWith("/dashboard/"), roles: allRoles },
  { matches: (path) => path === "/calendar" || path.startsWith("/calendar/"), roles: allRoles },
  { matches: (path) => path === "/events" || path.startsWith("/events/"), roles: allRoles }
];

export function canAccessPage(role: AppRole | null, pathname: string) {
  if (pathname === "/") return Boolean(role);
  const rule = pageRules.find((candidate) => candidate.matches(pathname));
  return Boolean(rule && role && rule.roles.includes(role));
}

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && value in roleLabels;
}
