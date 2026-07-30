import Link from "next/link";

export default function NotFound() {
  return (
    <div className="login-page">
      <div className="card login-card">
        <h1>Event not found</h1>
        <p className="muted">The event may have been removed or your role may not have access.</p>
        <Link className="button primary" href="/events">Return to events</Link>
      </div>
    </div>
  );
}
