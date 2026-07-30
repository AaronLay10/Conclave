export function StatCard({
  label,
  value,
  meta
}: {
  label: string;
  value: string | number;
  meta: string;
}) {
  return (
    <div className="card stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-meta">{meta}</div>
    </div>
  );
}
