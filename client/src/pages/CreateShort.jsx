import { useState } from 'react';
import { Lightbulb, Sparkles } from 'lucide-react';
import { api } from '../api/http.js';
import { nicheOptions } from '../themeTemplates.js';

const niches = nicheOptions.map((option) => option.label);

function buildInitialForm() {
  return {
    topic: '',
    niche: niches[0],
    tone: 'Energetic',
    duration: 30,
    language: 'English'
  };
}

const initialForm = buildInitialForm();

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

  const handleNicheChange = (niche) => {
    setForm((current) => ({ ...current, niche }));
  };

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
      const { data } = await api.post('/shorts/create', payload);
      const project = data.project || data;
      setResult(project);
      setProgress({
        percent: project.progressPercent ?? 0,
        stage: project.progressStage || project.status,
        message: project.progressMessage || data.message || 'Short generation started.'
      });

      const completed = await pollProject(project._id);
      if (completed?.status === 'failed') {
        setError(completed.errorMessage || 'Generation failed. Check MongoDB, Ollama, FFmpeg, Pexels, and Windows SAPI.');
      } else if (completed?.status === 'completed') {
        setForm(buildInitialForm());
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Generation failed. Check MongoDB, Ollama, FFmpeg, and Windows SAPI.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <header className="page-heading">
        <div><p className="eyebrow">New project</p><h1>Create a short</h1><p>Define the idea and output. The system will generate the script, voice, captions, and video.</p></div>
      </header>
      <div className="create-layout">
      <form onSubmit={submit} className="data-section create-form">
        <div className="section-heading"><div><h2>Project details</h2><p>Set the creative direction for this video.</p></div></div>
        <div className="form-body">
          <label className="form-label">Topic
            <input className="field" required placeholder="For example: 5 AI tools for students" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
          </label>
          <div className="form-group">
            <div className="form-row-heading"><label className="form-label" htmlFor="niche">Niche</label>
              <button className="text-action" disabled={ideasLoading} onClick={generateIdeas} type="button"><Lightbulb size={15} />{ideasLoading ? 'Generating...' : 'Suggest topics'}</button>
            </div>
              <select id="niche" className="field" value={form.niche} onChange={(e) => handleNicheChange(e.target.value)}>
                {niches.map((niche) => <option key={niche}>{niche}</option>)}
              </select>
            {ideasError && <p className="inline-error">{ideasError}</p>}
            {ideas.length > 0 && (
              <div className="idea-list">
                {ideas.map((idea) => (
                  <button
                    className={`idea-option ${
                      form.topic === idea
                        ? 'is-selected'
                        : ''
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
          <div className="form-grid">
          <label className="form-label">Tone<select className="field" value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })}>
            <option>Energetic</option>
            <option>Luxury</option>
            <option>Funny</option>
            <option>Educational</option>
            <option>Dramatic</option>
          </select></label>
          <label className="form-label">Language<select className="field" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
            <option value="English">English</option>
            <option value="Hindi">Hindi</option>
          </select></label>
          </div>
          <fieldset className="form-group"><legend className="form-label">Duration</legend><div className="segment-control">
            {[15, 30, 60].map((duration) => <button className={Number(form.duration) === duration ? 'is-active' : ''} key={duration} onClick={() => setForm({ ...form, duration })} type="button">{duration} sec</button>)}
          </div></fieldset>
          <button className="btn-primary submit-button disabled:opacity-50" disabled={loading}><Sparkles size={17} />{loading ? 'Generating short...' : 'Generate short'}</button>
          {error && <p className="inline-error">{error}</p>}
        </div>
      </form>
      <aside className="data-section output-panel">
        <div className="section-heading"><div><h2>Generation status</h2><p>Live output from the current project.</p></div></div>
        <div className="output-body">
        {!result && !progress && <div className="quiet-state"><Sparkles size={20} /><p>Your title, script, media, and render progress will appear here.</p></div>}
        {progress && (
          <div className="progress-panel">
            <div className="progress-heading">
              <span>{progress.stage}</span><strong>{progress.percent}%</strong>
            </div>
            <div className="progress-track"><div style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }} /></div>
            <p>{progress.message}</p>
          </div>
        )}
        {result && (
          <div className="result-details">
            <p><span>Status</span><strong>{result.status || result.project?.status}</strong></p>
            <p><span>Title</span><strong>{result.title || result.project?.title}</strong></p>
            <p><span>Hook</span><strong>{result.hook || result.project?.hook || 'Your short is being assembled.'}</strong></p>
            {result.media?.backgroundCredit && (
              <p className="credit-line">
                {result.media.backgroundCreditUrl ? (
                  <a className="text-mint hover:text-gold" href={result.media.backgroundCreditUrl} rel="noreferrer" target="_blank">
                    {result.media.backgroundCredit}
                  </a>
                ) : result.media.backgroundCredit}
              </p>
            )}
            <p className="output-note">Open Video library to review and download the completed MP4.</p>
          </div>
        )}
        </div>
      </aside>
      </div>
    </div>
  );
}
