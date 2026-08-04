import { DiscordConnectionPanel } from "@/components/discord-connection-panel";
import { DiscordWhitelistPanel } from "@/components/discord-whitelist-panel";
import { DemoBanner } from "@/components/demo-banner";
import { getCurrentUser } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function Check({ ok, title, detail }: { ok: boolean; title: string; detail: string }) {
  return (
    <div className="check">
      <span className={`status-dot ${ok ? "ok" : "warn"}`} />
      <div>
        <strong>{title}</strong>
        <div className="muted" style={{ fontSize: ".8rem" }}>{detail}</div>
      </div>
    </div>
  );
}

export default async function SettingsPage() {
  const supabase = isSupabaseConfigured();
  const user = await getCurrentUser();

  return (
    <>
      <DemoBanner />
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="muted">Deployment, Discord delivery, and operating defaults.</p>
        </div>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <div className="card-header"><h2 style={{ margin: 0 }}>Platform</h2></div>
          <div className="card-body checklist">
            <Check
              ok={supabase}
              title="Supabase connection"
              detail={supabase ? "Database and authentication environment detected." : "Add the Supabase URL and publishable key."}
            />
            <Check
              ok={Boolean(user) && supabase}
              title="Discord authentication"
              detail={user?.email ? `Signed in as ${user.email}.` : "Sign in through Discord to manage Conclave."}
            />
            <Check
              ok={supabase}
              title="Row Level Security"
              detail="Event and announcement permissions are enforced by kingdom role."
            />
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h2 style={{ margin: 0 }}>Operating defaults</h2></div>
          <div className="card-body">
            <dl className="detail-list">
              <dt>Kingdom</dt><dd>4126</dd>
              <dt>Official time</dt><dd>UTC</dd>
              <dt>Director timezone</dt><dd>America/Phoenix</dd>
              <dt>Calendar policy</dt><dd>Confirmed, predicted, leadership scheduled, or TBD</dd>
              <dt>Deployment</dt><dd>Vercel + Supabase only</dd>
            </dl>
          </div>
        </div>
      </div>

      <section className="section">
        <DiscordWhitelistPanel />
      </section>

      <section className="section">
        <DiscordConnectionPanel />
      </section>
    </>
  );
}
