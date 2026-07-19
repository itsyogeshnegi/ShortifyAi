export default function StatCard({ label, value, caption, icon: Icon }) {
  return (
    <article className="metric-card">
      <div className="metric-heading"><span>{label}</span>{Icon && <Icon size={17} strokeWidth={1.8} />}</div>
      <strong className="metric-value">{value}</strong>
      <p>{caption}</p>
    </article>
  );
}
