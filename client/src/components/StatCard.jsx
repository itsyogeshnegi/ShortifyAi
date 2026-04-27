export default function StatCard({ label, value, caption }) {
  return (
    <div className="glass group min-w-0 overflow-hidden rounded-[1.5rem] p-5 transition duration-200 hover:-translate-y-1 hover:border-mint/30">
      <div className="relative z-10">
        <div className="mb-5 h-1 w-14 rounded-full bg-gradient-to-r from-mint to-ember shadow-[0_0_24px_rgba(110,243,197,0.35)]" />
        <p className="text-sm font-semibold text-frost/55">{label}</p>
        <p className="mt-2 font-display text-5xl font-bold tracking-[-0.06em] text-white">{value}</p>
        <p className="mt-2 text-sm text-frost/50">{caption}</p>
      </div>
    </div>
  );
}
