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
        {membership?.role === "event_director" && <Link href="/activity/import" className="button primary"><FileUp size={17} /> Import activity</Link>}
      </div>
      <ActivityCenter initialSnapshot={snapshot} />
    </>
  );
}
import Link from "next/link";
import { FileUp } from "lucide-react";
