"use client";

import { RefreshCw, Send, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type DiscordStatus = {
  configured: boolean;
  connected: boolean;
  webhookName?: string | null;
  channelId?: string | null;
  guildId?: string | null;
  detail?: string;
};

async function readFunctionError(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "context" in error) {
    const context = (error as { context?: unknown }).context;

    if (context instanceof Response) {
      try {
        const payload = await context.clone().json() as {
          error?: string;
          message?: string;
          detail?: string;
        };

        return payload.error ?? payload.message ?? payload.detail ?? fallback;
      } catch {
        try {
          const text = await context.clone().text();
          if (text.trim()) return text;
        } catch {
          // Fall through to the normal Error message.
        }
      }
    }
  }

  return error instanceof Error ? error.message : fallback;
}

export function DiscordConnectionPanel() {
  const [status, setStatus] = useState<DiscordStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { data, error: invokeError } = await supabase.functions.invoke(
        "publish-discord",
        { body: { action: "status" } }
      );

      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);
      setStatus(data as DiscordStatus);
    } catch (err) {
      setStatus(null);
      setError(await readFunctionError(
        err,
        "Unable to read the Discord connection status."
      ));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function sendTest() {
    setTesting(true);
    setMessage("");
    setError("");

    try {
      const supabase = createClient();
      const { data, error: invokeError } = await supabase.functions.invoke(
        "publish-discord",
        { body: { action: "test" } }
      );

      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);

      setMessage("Test message published to Discord.");
      await loadStatus();
    } catch (err) {
      setError(await readFunctionError(err, "Discord test failed."));
    } finally {
      setTesting(false);
    }
  }

  const connected = Boolean(status?.connected);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 style={{ margin: 0 }}>Discord connection</h2>
          <div className="muted" style={{ fontSize: ".78rem", marginTop: 4 }}>
            Secure webhook delivery through Supabase Edge Functions
          </div>
        </div>
        <button className="button" type="button" onClick={loadStatus} disabled={loading}>
          <RefreshCw size={15} /> {loading ? "Checking…" : "Refresh"}
        </button>
      </div>

      <div className="card-body">
        <div className="check" style={{ marginBottom: 18 }}>
          <span className={`status-dot ${connected ? "ok" : "warn"}`} />
          <div>
            <strong>
              {loading
                ? "Checking Discord"
                : connected
                  ? "Discord connected"
                  : status?.configured
                    ? "Webhook connection failed"
                    : "Discord webhook not configured"}
            </strong>
            <div className="muted" style={{ fontSize: ".8rem" }}>
              {status?.detail ??
                "Conclave will verify the webhook without exposing its URL."}
            </div>
          </div>
        </div>

        {connected && (
          <dl className="detail-list" style={{ marginBottom: 18 }}>
            <dt>Webhook</dt><dd>{status?.webhookName ?? "Conclave"}</dd>
            <dt>Channel ID</dt><dd>{status?.channelId ?? "Unavailable"}</dd>
            <dt>Server ID</dt><dd>{status?.guildId ?? "Unavailable"}</dd>
          </dl>
        )}

        {!status?.configured && !loading && (
          <div className="copy-box" style={{ marginBottom: 18 }}>
            Add <strong>DISCORD_WEBHOOK_URL</strong> under Supabase → Edge Functions → Secrets,
            then refresh this panel.
          </div>
        )}

        {message && <div className="form-success" style={{ marginBottom: 14 }}>{message}</div>}
        {error && <div className="form-error" style={{ marginBottom: 14 }}>{error}</div>}

        <div className="actions">
          <button
            className="button primary"
            type="button"
            onClick={sendTest}
            disabled={!connected || testing}
          >
            <Send size={15} /> {testing ? "Sending…" : "Send test message"}
          </button>
          <span className="row muted" style={{ fontSize: ".78rem" }}>
            <ShieldCheck size={15} /> Event Director authorization required
          </span>
        </div>
      </div>
    </div>
  );
}
