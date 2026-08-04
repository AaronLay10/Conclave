import Link from "next/link";
import { ShieldX } from "lucide-react";

export default function AccessDeniedPage() {
  return (
    <div className="login-page">
      <div className="card login-card">
        <div className="login-emblem"><ShieldX size={37} /></div>
        <h1>Page access restricted</h1>
        <p className="muted">Your Conclave role does not include this page. Contact an Event Director if your responsibilities have changed.</p>
        <Link className="button primary" href="/dashboard" style={{ width: "100%", marginTop: 12 }}>Return to dashboard</Link>
      </div>
    </div>
  );
}
