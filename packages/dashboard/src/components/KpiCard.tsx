export function KpiCard({ label, value, delta }: { label: string; value: string; delta?: string }) {
  return (
    <div className="kpi-card">
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
      {delta ? <div className="kpi-delta">{delta}</div> : null}
    </div>
  );
}