import { DemoBanner } from "@/components/demo-banner";
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

export default function SettingsPage() {
  const supabase = isSupabaseConfigured();

  return (
    <>
      <DemoBanner />
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="muted">Deployment and integration readiness.</p>
        </div>
      </div>
      <div className="grid cols-2">
        <div className="card">
          <div className="card-header"><h2 style={{ margin: 0 }}>Platform</h2></div>
          <div className="card-body checklist">
            <Check ok={supabase} title="Supabase connection" detail={supabase ? "Environment variables detected." : "Add URL and publishable key to .env.local and Vercel."} />
            <Check ok={false} title="Discord OAuth" detail="Create a Discord application and enable the Discord provider in Supabase Auth." />
            <Check ok={false} title="Discord webhook" detail="Add DISCORD_WEBHOOK_URL as an Edge Function secret." />
            <Check ok={false} title="Reminder cron" detail="Deploy dispatch-reminders and schedule it through Supabase Cron." />
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
    </>
  );
}
