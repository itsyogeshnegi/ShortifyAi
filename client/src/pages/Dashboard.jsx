import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/http.js';
import StatCard from '../components/StatCard.jsx';
import VideoCard from '../components/VideoCard.jsx';

export default function Dashboard() {
  const [projects, setProjects] = useState([]);

  const load = async () => {
    const { data } = await api.get('/shorts');
    setProjects(data);
  };

  useEffect(() => {
    load();
  }, []);

  const completed = projects.filter((p) => p.status === 'completed');
  const downloads = projects.reduce((sum, project) => sum + (project.downloads || 0), 0);

  return (
    <div className="grid min-w-0 gap-6">
      <section className="grid min-w-0 gap-4 md:grid-cols-3">
        <StatCard label="Total projects" value={projects.length} caption="All created shorts" />
        <StatCard label="Generated videos" value={completed.length} caption="Ready MP4 files" />
        <StatCard label="Downloads" value={downloads} caption="Across all projects" />
      </section>
      <section className="grid min-w-0 gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="neon-label">Launch queue</p>
            <h2 className="section-title mt-2 text-3xl">Recent shorts</h2>
          </div>
          <Link className="btn-primary" to="/create">Create new</Link>
        </div>
        {projects.slice(0, 3).map((project) => <VideoCard key={project._id} project={project} onDeleted={load} />)}
        {!projects.length && <p className="glass rounded-[1.5rem] p-6 text-frost/60">No shorts yet. Let the tiny robot director cook.</p>}
      </section>
    </div>
  );
}
