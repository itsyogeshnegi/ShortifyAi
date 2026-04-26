import { useAuth } from '../context/AuthContext.jsx';

export default function Settings() {
  const { user } = useAuth();

  return (
    <div className="glass rounded-[2rem] p-6">
      <p className="text-sm font-bold uppercase tracking-[0.25em] text-mint">Settings</p>
      <h1 className="mt-3 font-display text-4xl font-bold">Local runtime</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl bg-white/5 p-5">
          <p className="text-sm text-frost/50">Account</p>
          <p className="mt-2 font-bold">{user?.name}</p>
          <p className="text-frost/60">{user?.email}</p>
        </div>
        <div className="rounded-3xl bg-white/5 p-5">
          <p className="text-sm text-frost/50">Model endpoint</p>
          <p className="mt-2 font-bold">http://localhost:11434</p>
          <p className="text-frost/60">Configured on the server with OLLAMA_BASE_URL.</p>
        </div>
      </div>
    </div>
  );
}
