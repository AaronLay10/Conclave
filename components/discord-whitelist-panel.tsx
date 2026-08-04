"use client";

import { useEffect, useState } from "react";
import { KeyRound, Plus, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";

type WhitelistEntry = {
  id: string;
  discord_user_id: string;
  display_name: string | null;
  note: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function DiscordWhitelistPanel() {
  const [entries, setEntries] = useState<WhitelistEntry[]>([]);
  const [currentDiscordId, setCurrentDiscordId] = useState("");
  const [discordId, setDiscordId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function loadEntries() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/settings/discord-whitelist", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to load the whitelist.");
      setEntries(data.entries ?? []);
      setCurrentDiscordId(data.current_discord_user_id ?? "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load the whitelist.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEntries();
  }, []);

  async function request(method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>) {
    const response = await fetch("/api/settings/discord-whitelist", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Unable to update the whitelist.");
  }

  async function addEntry() {
    setSaving(true);
    setError(null);
    setResult(null);
    try {
      await request("POST", {
        discord_user_id: discordId.trim(),
        display_name: displayName,
        note
      });
      setDiscordId("");
      setDisplayName("");
      setNote("");
      setResult("Discord user added to the login whitelist.");
      await loadEntries();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to add the user.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleEntry(entry: WhitelistEntry) {
    setSaving(true);
    setError(null);
    setResult(null);
    try {
      await request("PATCH", {
        discord_user_id: entry.discord_user_id,
        display_name: entry.display_name ?? "",
        note: entry.note ?? "",
        is_active: !entry.is_active
      });
      setResult(`${entry.display_name || entry.discord_user_id} ${entry.is_active ? "disabled" : "enabled"}.`);
      await loadEntries();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update the user.");
    } finally {
      setSaving(false);
    }
  }

  async function removeEntry(entry: WhitelistEntry) {
    if (!window.confirm(`Remove ${entry.display_name || entry.discord_user_id} from the login whitelist?`)) return;
    setSaving(true);
    setError(null);
    setResult(null);
    try {
      await request("DELETE", { discord_user_id: entry.discord_user_id });
      setResult(`${entry.display_name || entry.discord_user_id} removed.`);
      await loadEntries();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to remove the user.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="row"><KeyRound size={18} /><strong>Discord login whitelist</strong></div>
        <button className="icon-button" aria-label="Refresh Discord whitelist" onClick={() => loadEntries()} disabled={loading || saving}>
          <RefreshCw size={16} />
        </button>
      </div>
      <div className="card-body form">
        <div className="import-guidance">
          <ShieldCheck size={19} />
          <div>
            <strong>Event Director controlled</strong>
            <p>Once the first entry is added, only active Discord User IDs listed here can sign in or keep an active Conclave session.</p>
          </div>
        </div>

        <div className="form-grid whitelist-form">
          <div className="field">
            <label htmlFor="whitelist-discord-id">Discord User ID</label>
            <input id="whitelist-discord-id" inputMode="numeric" placeholder="Example: 123456789012345678" value={discordId} onChange={(event) => setDiscordId(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="whitelist-name">Display name</label>
            <input id="whitelist-name" placeholder="Leadership name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </div>
          <div className="field full">
            <label htmlFor="whitelist-note">Note</label>
            <input id="whitelist-note" placeholder="Role or reason for access" value={note} onChange={(event) => setNote(event.target.value)} />
          </div>
        </div>
        <button className="button primary" onClick={addEntry} disabled={saving || discordId.trim().length < 5}>
          <Plus size={17} /> {saving ? "Saving…" : "Add Discord user"}
        </button>
        {currentDiscordId && <small>Your protected Discord User ID: <span className="code">{currentDiscordId}</span></small>}
        {error && <div className="form-error">{error}</div>}
        {result && <div className="form-success">{result}</div>}
      </div>

      {loading ? (
        <div className="empty">Loading login access…</div>
      ) : entries.length === 0 ? (
        <div className="empty">The whitelist is empty. Role-based login remains available until the first entry is added.</div>
      ) : (
        <div className="whitelist-list">
          {entries.map((entry) => {
            const isCurrentUser = entry.discord_user_id === currentDiscordId;
            return (
              <div className="whitelist-row" key={entry.id}>
                <div>
                  <div className="row">
                    <strong>{entry.display_name || "Unnamed Discord user"}</strong>
                    {isCurrentUser && <span className="badge leadership_scheduled">You</span>}
                    <span className={`badge ${entry.is_active ? "confirmed" : "archived"}`}>{entry.is_active ? "Active" : "Disabled"}</span>
                  </div>
                  <div className="event-meta">{entry.discord_user_id}{entry.note ? ` · ${entry.note}` : ""}</div>
                </div>
                <div className="actions">
                  <button className="button" onClick={() => toggleEntry(entry)} disabled={saving || isCurrentUser}>
                    {entry.is_active ? "Disable" : "Enable"}
                  </button>
                  <button className="icon-button" aria-label={`Remove ${entry.display_name || entry.discord_user_id}`} onClick={() => removeEntry(entry)} disabled={saving || isCurrentUser}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
