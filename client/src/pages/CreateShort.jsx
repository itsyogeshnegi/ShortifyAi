import { useState } from 'react';
import { api } from '../api/http.js';

const niches = [
  'Money / Success',
  'AI / Tech',
  'Motivation',
  'Facts / Knowledge',
  'Fitness / Bodybuilding',
  'Crypto / Finance',
  'Relationships / Psychology'
];

const initialForm = {
  topic: '',
  niche: niches[0],
  tone: 'Energetic',
  duration: 30,
  language: 'English',
  scheduledFor: ''
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function CreateShort() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideas, setIdeas] = useState([]);
  const [ideasError, setIdeasError] = useState('');
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');

  const pollProject = async (projectId) => {
    while (projectId) {
      const { data } = await api.get(`/shorts/${projectId}`);
      setResult(data);
      setProgress({
        percent: data.progressPercent ?? 0,
        stage: data.progressStage || data.status,
        message: data.progressMessage || 'Working on your short...'
      });

      if (['completed', 'failed', 'expired'].includes(data.status)) return data;
      await sleep(1800);
    }
    return null;
  };

  const generateIdeas = async () => {
    setIdeasLoading(true);
    setIdeasError('');
    setIdeas([]);

    try {
      const { data } = await api.post('/ai/topics', { niche: form.niche });
      setIdeas(data.topics || []);
    } catch (err) {
      setIdeasError(err.response?.data?.message || 'Could not generate topic ideas. Make sure Ollama is running.');
    } finally {
      setIdeasLoading(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    setProgress({ percent: 0, stage: 'queued', message: 'Project queued.' });

    try {
      const payload = { ...form, duration: Number(form.duration) };
      if (!payload.scheduledFor) delete payload.scheduledFor;
      const { data } = await api.post('/shorts/create', payload);
      const project = data.project || data;
      setResult(project);
      setProgress({
        percent: project.progressPercent ?? 0,
        stage: project.progressStage || project.status,
        message: project.progressMessage || data.message || 'Short generation started.'
      });

      if (project.status === 'scheduled') {
        setForm(initialForm);
        return;
      }

      const completed = await pollProject(project._id);
      if (completed?.status === 'failed') {
        setError(completed.errorMessage || 'Generation failed. Check MongoDB, Ollama, FFmpeg, Pexels, and Windows SAPI.');
      } else if (completed?.status === 'completed') {
        setForm(initialForm);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Generation failed. Check MongoDB, Ollama, FFmpeg, and Windows SAPI.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
      <form onSubmit={submit} className="glass min-w-0 rounded-[2rem] p-5 sm:p-6">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-mint">Create Short</p>
        <h1 className="mt-3 break-words font-display text-4xl font-bold leading-tight">Prompt the factory</h1>
        <div className="mt-6 grid gap-4">
          <input className="field" required placeholder="Topic, e.g. 5 AI tools for students" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
          <div className="grid gap-3">
            <select className="field" value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })}>
              {niches.map((niche) => <option key={niche}>{niche}</option>)}
            </select>
            <button
              className="btn-muted w-full disabled:opacity-50"
              disabled={ideasLoading}
              onClick={generateIdeas}
              type="button"
            >
              {ideasLoading ? 'Generating ideas...' : 'Generate 20 Ideas'}
            </button>
            {ideasError && <p className="break-words rounded-2xl bg-ember/15 p-3 text-sm text-ember">{ideasError}</p>}
            {ideas.length > 0 && (
              <div className="grid max-h-80 gap-2 overflow-y-auto rounded-3xl border border-white/10 bg-ink/30 p-3">
                {ideas.map((idea) => (
                  <button
                    className={`rounded-2xl border p-3 text-left text-sm font-bold transition ${
                      form.topic === idea
                        ? 'border-mint bg-mint/15 text-mint'
                        : 'border-white/10 bg-white/5 text-frost/80 hover:border-mint/60 hover:bg-mint/10 hover:text-white'
                    }`}
                    key={idea}
                    onClick={() => setForm({ ...form, topic: idea })}
                    type="button"
                  >
                    {idea}
                  </button>
                ))}
              </div>
            )}
          </div>
          <select className="field" value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })}>
            <option>Energetic</option>
            <option>Luxury</option>
            <option>Funny</option>
            <option>Educational</option>
            <option>Dramatic</option>
          </select>
          <select className="field" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })}>
            <option value="15">15 seconds</option>
            <option value="30">30 seconds</option>
            <option value="60">60 seconds</option>
          </select>
          <input className="field" required placeholder="Language" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} />
          <label className="text-sm font-bold text-frost/70">
            Schedule for later
            <input className="field mt-2" type="datetime-local" value={form.scheduledFor} onChange={(e) => setForm({ ...form, scheduledFor: e.target.value })} />
          </label>
        </div>
        <button className="btn-primary mt-6 w-full disabled:opacity-50" disabled={loading}>{loading ? 'Generating...' : 'Generate short'}</button>
        {error && <p className="mt-4 break-words rounded-2xl bg-ember/15 p-3 text-sm text-ember">{error}</p>}
      </form>
      <aside className="glass min-w-0 rounded-[2rem] p-5 sm:p-6">
        <h2 className="font-display text-2xl font-bold">Output preview</h2>
        {!result && !progress && <p className="mt-4 text-frost/60">Generated title, hook, files, and schedule status will appear here.</p>}
        {progress && (
          <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-bold uppercase tracking-[0.2em] text-mint">{progress.stage}</span>
              <span className="font-bold text-white">{progress.percent}%</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-ink/70">
              <div
                className="h-full rounded-full bg-gradient-to-r from-mint to-gold transition-all duration-700"
                style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
              />
            </div>
            <p className="mt-3 break-words text-sm text-frost/70">{progress.message}</p>
          </div>
        )}
        {result && (
          <div className="mt-5 grid gap-4 text-sm">
            <p><span className="font-bold text-mint">Status:</span> {result.status || result.project?.status}</p>
            <p className="break-words"><span className="font-bold text-mint">Title:</span> {result.title || result.project?.title}</p>
            <p className="break-words"><span className="font-bold text-mint">Hook:</span> {result.hook || result.project?.hook || 'Scheduled job queued.'}</p>
            {result.media?.backgroundCredit && (
              <p className="break-words text-frost/60">
                {result.media.backgroundCreditUrl ? (
                  <a className="text-mint hover:text-gold" href={result.media.backgroundCreditUrl} rel="noreferrer" target="_blank">
                    {result.media.backgroundCredit}
                  </a>
                ) : result.media.backgroundCredit}
              </p>
            )}
            <p className="text-frost/60">Open My Videos to download completed MP4 files.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
