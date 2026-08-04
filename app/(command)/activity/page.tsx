import { ActivityCenter } from "@/components/activity-center";
import { DemoBanner } from "@/components/demo-banner";
import { getCurrentMembership, getLatestActivitySnapshot } from "@/lib/data";

export default async function ActivityPage() {
  const [snapshot, membership] = await Promise.all([
    getLatestActivitySnapshot(),
    getCurrentMembership()
  ]);

  return (
    <>
      <DemoBanner />
      <div className="page-header">
        <div>
          <h1>Alliance Activity</h1>
          <p className="muted">Review participation, identify support needs, and keep alliance activity visible.</p>
        </div>
      </div>
      <ActivityCenter initialSnapshot={snapshot} canImport={membership?.role === "event_director"} />
    </>
  );
}
