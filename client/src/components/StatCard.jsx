export default function StatCard({ label, value, caption }) {
  return (
    <div className="glass min-w-0 rounded-[1.5rem] p-5">
      <p className="text-sm font-semibold text-frost/55">{label}</p>
      <p className="mt-2 font-display text-4xl font-bold">{value}</p>
      <p className="mt-2 text-sm text-frost/55">{caption}</p>
    </div>
  );
}
