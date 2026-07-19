import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
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
    <div className="page-stack">
      <header className="page-heading">
        <div><p className="eyebrow">Content library</p><h1>Video library</h1><p>Review, download, and publish your generated shorts.</p></div>
        <Link className="btn-primary" to="/create"><Plus size={17} /> Create short</Link>
      </header>
      <div className="video-library">{projects.map((project) => <VideoCard key={project._id} project={project} onDeleted={load} />)}</div>
      {!projects.length && <div className="data-section empty-state"><strong>No videos yet</strong><span>Completed projects will appear in this library.</span></div>}
    </div>
  );
}
