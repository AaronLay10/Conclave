import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CalendarImporter } from "@/components/calendar-importer";

export default function CalendarImportPage() {
  return (
    <>
      <div className="page-header">
        <div>
          <h1>Calendar Import</h1>
          <p className="muted">Review in-game calendar evidence before it reaches the live calendar.</p>
        </div>
        <Link className="button" href="/events"><ArrowLeft size={17} /> Events</Link>
      </div>
      <CalendarImporter />
    </>
  );
}
