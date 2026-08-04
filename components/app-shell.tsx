"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  BellRing,
  ChartNoAxesCombined,
  CalendarDays,
  CalendarSearch,
  FileUp,
  FileText,
  LayoutDashboard,
  ListChecks,
  Settings,
  WandSparkles
} from "lucide-react";
import { canAccessPage, isAllianceLeadershipRole, roleLabels, type AppRole } from "@/lib/access-control";

const navItems = [
  { href: "/dashboard", label: "Command Center", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/predictions", label: "Predictions", icon: CalendarSearch },
  { href: "/events", label: "Events", icon: ListChecks },
  { href: "/events/import", label: "Calendar Import", icon: FileUp },
  { href: "/activity", label: "Alliance Activity", icon: ChartNoAxesCombined },
  { href: "/activity/import", label: "Activity Import", icon: FileUp },
  { href: "/templates", label: "Templates", icon: WandSparkles },
  { href: "/announcements", label: "Announcements", icon: BellRing },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function AppShell({
  children,
  userName,
  role,
  allianceName,
  allianceTag
}: {
  children: React.ReactNode;
  userName: string;
  role: AppRole;
  allianceName: string | null;
  allianceTag: string | null;
}) {
  const pathname = usePathname();
  const alliancePortal = isAllianceLeadershipRole(role);
  const is126V = allianceTag?.toUpperCase() === "126V";
  const isAdmin = role === "event_director";
  const themeClass = is126V ? "alliance-theme-126v" : isAdmin ? "admin-theme-conclave" : "";
  const brandEmblem = is126V
    ? "/branding/126v-emblem-red-gold.png"
    : "/branding/conclave-favicon.png";
  const allianceIdentity = allianceName && allianceTag ? `${allianceName} [${allianceTag}]` : "Your alliance";
  const visibleNavItems = navItems.filter(({ href }) => canAccessPage(role, href));
  const activeHref = [...visibleNavItems]
    .sort((left, right) => right.href.length - left.href.length)
    .find(({ href }) => pathname === href || pathname.startsWith(`${href}/`))?.href;

  return (
    <div className={`app-layout ${themeClass}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Image
              src={brandEmblem}
              alt={is126V ? "126V alliance emblem" : "Conclave emblem"}
              width={43}
              height={43}
              priority
            />
          </div>
          <div>
            <strong>Conclave</strong>
            <span>{alliancePortal ? "Alliance Leadership" : "Kingdom Command"}</span>
          </div>
        </div>
        <nav className="nav" aria-label="Primary navigation">
          {visibleNavItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-link ${activeHref === href ? "active" : ""}`}
            >
              <Icon size={18} />
              {href === "/dashboard" && alliancePortal ? "Alliance Home" : label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="card" style={{ padding: 13 }}>
            <div className="row"><FileText size={15} /><strong>{alliancePortal ? allianceIdentity : "Kingdom 4126"}</strong></div>
            <small>{roleLabels[role]} · {userName}</small>
          </div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            <div className="topbar-title">{alliancePortal ? `${allianceTag ? `[${allianceTag}] · ` : ""}Alliance Portal` : "Kingdom 4126 · Conclave"}</div>
          </div>
          <div className="row">
            <span className="badge leadership_scheduled">UTC</span>
            <div className="topbar-identity"><strong>{userName}</strong><small>{roleLabels[role]}</small></div>
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
