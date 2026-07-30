import { isSupabaseConfigured } from "@/lib/supabase/config";

export function DemoBanner() {
  if (isSupabaseConfigured()) return null;

  return (
    <div className="demo-banner">
      <strong>Demo mode:</strong> Supabase credentials are not configured. The
      command center is using Kingdom 4126 sample events; write actions remain
      disabled until <span className="code">.env.local</span> is configured.
    </div>
  );
}
