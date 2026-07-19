import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock3, Download, FolderKanban, Plus } from 'lucide-react';
import { api } from '../api/http.js';
import StatCard from '../components/StatCard.jsx';

function formatDate(value) {
  if (!value) return 'Not available';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setError('');
      const { data } = await api.get('/shorts');
      setProjects(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load your projects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  const completed = projects.filter((project) => project.status === 'completed');
  const active = projects.filter((project) => ['queued', 'generating'].includes(project.status));
  const downloads = projects.reduce((sum, project) => sum + (project.downloads || 0), 0);
  const recent = projects.slice(0, 5);

  return (
    <div className="page-stack">
      <header className="page-heading">
        <div><p className="eyebrow">Creator overview</p><h1>Your short-form workspace</h1><p>Track production, review recent videos, and start your next project.</p></div>
        <Link className="btn-primary" to="/create"><Plus size={17} /> Create short</Link>
      </header>

      <section className="metrics-grid" aria-label="Workspace metrics">
        <StatCard label="All projects" value={projects.length} caption="Total created" icon={FolderKanban} />
        <StatCard label="Completed" value={completed.length} caption="Ready to publish" icon={CheckCircle2} />
        <StatCard label="In progress" value={active.length} caption="Currently processing" icon={Clock3} />
        <StatCard label="Downloads" value={downloads} caption="Across all videos" icon={Download} />
      </section>

      <section className="data-section">
        <div className="section-heading">
          <div><h2>Recent projects</h2><p>Your latest short-form video activity.</p></div>
          <Link className="text-action" to="/videos">View library <ArrowRight size={15} /></Link>
        </div>
        {loading && <div className="empty-state">Loading projects...</div>}
        {error && <div className="alert-error">{error}</div>}
        {!loading && !error && recent.length > 0 && (
          <div className="project-table" role="table" aria-label="Recent projects">
            <div className="project-row project-table-head" role="row"><span>Project</span><span>Status</span><span>Format</span><span>Created</span><span /></div>
            {recent.map((project) => (
              <div className="project-row" role="row" key={project._id}>
                <div className="project-name"><strong>{project.title || project.topic}</strong><small>{project.niche || 'General'}</small></div>
                <span><i className={`status-dot status-${project.status}`} />{project.status}</span>
                <span>{project.duration}s · {project.language}</span>
                <span>{formatDate(project.createdAt)}</span>
                <Link className="icon-action" to="/videos" title="Open video library"><ArrowRight size={16} /></Link>
              </div>
            ))}
          </div>
        )}
        {!loading && !error && !recent.length && (
          <div className="empty-state"><strong>No projects yet</strong><span>Create your first short to begin building your library.</span><Link className="btn-primary" to="/create">Create short</Link></div>
        )}
      </section>
    </div>
  );
}
