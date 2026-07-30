import { BellRing, Clock3, ShieldCheck } from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { getTemplates } from "@/lib/data";

export default async function TemplatesPage() {
  const templates = await getTemplates();

  return (
    <>
      <DemoBanner />
      <div className="page-header">
        <div>
          <h1>Event Templates</h1>
          <p className="muted">Reusable operating plans for common Rise of Kingdoms events.</p>
        </div>
      </div>
      <div className="grid cols-3">
        {templates.map(template => (
          <div className="card" key={template.id}>
            <div className="card-header">
              <div>
                <strong>{template.name}</strong>
                <div className="event-meta">{template.category}</div>
              </div>
              <span className="badge approved">{template.default_scope}</span>
            </div>
            <div className="card-body stack">
              <p>{template.description}</p>
              <div className="row muted"><ShieldCheck size={16} /> {template.default_rules}</div>
              <div className="row muted"><Clock3 size={16} /> {template.reminder_offsets_minutes.length} reminder points</div>
              <div className="row muted"><BellRing size={16} /> Discord and in-game mail ready</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
