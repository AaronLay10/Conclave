import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ActivityImporter } from "@/components/activity-importer";
import { DemoBanner } from "@/components/demo-banner";
import { getLatestActivitySnapshot } from "@/lib/data";

export default async function ActivityImportPage() {
  const snapshot = await getLatestActivitySnapshot();

  return (
    <>
      <DemoBanner />
      <div className="page-header">
        <div><h1>Activity Import</h1><p className="muted">Upload Hero Scrolls reports and publish the next alliance activity snapshot.</p></div>
        <Link href="/activity" className="button"><ArrowLeft size={17} /> Member report</Link>
      </div>
      <ActivityImporter defaultAllianceTag={snapshot?.alliance_tag ?? "126V"} />
    </>
  );
}
