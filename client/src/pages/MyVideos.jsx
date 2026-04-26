import { useEffect, useState } from 'react';
import { api } from '../api/http.js';
import VideoCard from '../components/VideoCard.jsx';

export default function MyVideos() {
  const [projects, setProjects] = useState([]);

  const load = async () => {
    const { data } = await api.get('/shorts');
    setProjects(data);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="grid min-w-0 gap-5">
      <header className="glass rounded-[2rem] p-5 sm:p-6">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-mint">My Videos</p>
        <h1 className="mt-3 break-words font-display text-4xl font-bold leading-tight">Local MP4 library</h1>
      </header>
      {projects.map((project) => <VideoCard key={project._id} project={project} onDeleted={load} />)}
      {!projects.length && <p className="glass rounded-[1.5rem] p-6 text-frost/60">No videos created yet.</p>}
    </div>
  );
}
