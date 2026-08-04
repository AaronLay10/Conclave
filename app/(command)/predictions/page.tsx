import { DemoBanner } from "@/components/demo-banner";
import { PredictionReview } from "@/components/prediction-review";
import { getEvents } from "@/lib/data";

export default async function PredictionsPage() {
  const events = await getEvents();
  const predictions = events.filter((event) => event.certainty === "predicted");

  return (
    <>
      <DemoBanner />
      <div className="page-header">
        <div>
          <h1>Event Predictions</h1>
          <p className="muted">Review rolling Kingdom 4126 forecasts, correct dates, and confirm only after they appear in-game.</p>
        </div>
      </div>
      <PredictionReview predictions={predictions} />
    </>
  );
}
