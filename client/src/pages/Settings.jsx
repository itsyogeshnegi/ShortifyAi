import { useAuth } from '../context/AuthContext.jsx';

export default function Settings() {
  const { user } = useAuth();

  return (
    <div className="page-stack">
      <header className="page-heading"><div><p className="eyebrow">Workspace configuration</p><h1>Settings</h1><p>Review account and local runtime details.</p></div></header>
      <section className="settings-section">
        <div className="settings-row"><div><strong>Account</strong><span>The local workspace owner.</span></div><div className="settings-value"><strong>{user?.name}</strong><span>{user?.email}</span></div></div>
        <div className="settings-row"><div><strong>Model endpoint</strong><span>Ollama service used for script generation.</span></div><div className="settings-value"><code>localhost:11434</code><span>OLLAMA_BASE_URL</span></div></div>
        <div className="settings-row"><div><strong>Interface theme</strong><span>Optimized for focused production work.</span></div><div className="settings-value"><strong>Dark</strong><span>System default</span></div></div>
      </section>
    </div>
  );
}
