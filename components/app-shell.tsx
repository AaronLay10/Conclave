"use client";

import Link from "next/link";
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
  Shield,
  WandSparkles
} from "lucide-react";
import { canAccessPage, roleLabels, type AppRole } from "@/lib/access-control";

const navItems = [
  { href: "/dashboard", label: "Command Center", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/predictions", label: "Predictions", icon: CalendarSearch },
  { href: "/events", label: "Events", icon: ListChecks },
  { href: "/events/import", label: "Calendar Import", icon: FileUp },
  { href: "/activity", label: "Alliance Activity", icon: ChartNoAxesCombined },
  { href: "/templates", label: "Templates", icon: WandSparkles },
  { href: "/announcements", label: "Announcements", icon: BellRing },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function AppShell({
  children,
  userName,
  role
}: {
  children: React.ReactNode;
  userName: string;
  role: AppRole;
}) {
  const pathname = usePathname();

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Shield size={24} /></div>
          <div>
            <strong>Conclave</strong>
            <span>Kingdom Command</span>
          </div>
        </div>
        <nav className="nav" aria-label="Primary navigation">
          {navItems.filter(({ href }) => canAccessPage(role, href)).map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-link ${pathname.startsWith(href) ? "active" : ""}`}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="card" style={{ padding: 13 }}>
            <div className="row"><FileText size={15} /><strong>Kingdom 4126</strong></div>
            <small>{roleLabels[role]}: {userName}</small>
          </div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            <div className="topbar-title">Kingdom 4126 · Conclave</div>
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
