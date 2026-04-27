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
      <header className="glass overflow-hidden rounded-[2rem] p-5 sm:p-7">
        <div className="relative z-10">
          <p className="neon-label">My Videos</p>
          <h1 className="text-gradient mt-3 break-words font-display text-4xl font-bold leading-tight sm:text-5xl">Local MP4 library</h1>
          <p className="mt-3 max-w-2xl text-frost/60">Every rendered short, ready for preview, download, and publishing control.</p>
        </div>
      </header>
      {projects.map((project) => <VideoCard key={project._id} project={project} onDeleted={load} />)}
      {!projects.length && <p className="glass rounded-[1.5rem] p-6 text-frost/60">No videos created yet.</p>}
    </div>
  );
}
