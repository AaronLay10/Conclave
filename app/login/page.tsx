"use client";

import { Shield } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function LoginPage() {
  const [error, setError] = useState("");
  const configured = isSupabaseConfigured();

  async function signIn() {
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/complete`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: {
          redirectTo,
          scopes: "identify email"
        }
      });
      if (error) setError(error.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start login.");
    }
  }

  return (
    <div className="login-page">
      <div className="card login-card">
        <div className="login-emblem"><Shield size={37} /></div>
        <h1>Conclave</h1>
        <p className="muted">Where alliances plan as one.</p>
        <button className="button primary" style={{ width: "100%", marginTop: 12 }} onClick={signIn} disabled={!configured}>
          Continue with Discord
        </button>
        {!configured && <p className="form-error" style={{ marginTop: 14 }}>Supabase is not configured. Open <a href="/dashboard"><u>demo mode</u></a>.</p>}
        {error && <p className="form-error" style={{ marginTop: 14 }}>{error}</p>}
      </div>
    </div>
  );
}
