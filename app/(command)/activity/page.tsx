import { ActivityCenter } from "@/components/activity-center";
import { DemoBanner } from "@/components/demo-banner";
import { getLatestActivitySnapshot } from "@/lib/data";

export default async function ActivityPage() {
  const snapshot = await getLatestActivitySnapshot();

  return (
    <>
      <DemoBanner />
      <div className="page-header">
        <div>
          <h1>Alliance Activity</h1>
          <p className="muted">Import Hero Scrolls reports, score participation, and review member engagement.</p>
        </div>
      </div>
      <ActivityCenter initialSnapshot={snapshot} />
    </>
  );
}
