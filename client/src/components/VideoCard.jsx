import { useState } from 'react';
import { Download, Trash2, UploadCloud, X } from 'lucide-react';
import { api, mediaUrl, thumbUrl } from '../api/http.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function VideoCard({ project, onDeleted }) {
  const [currentProject, setCurrentProject] = useState(project);
  const canDownload = currentProject.status === 'completed' && currentProject.media?.videoFilename;
  const [reviewOpen, setReviewOpen] = useState(false);
  const [youtubeStatus, setYoutubeStatus] = useState(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [youtubeError, setYoutubeError] = useState('');
  const [uploadForm, setUploadForm] = useState({
    title: currentProject.youtube?.title || currentProject.title || currentProject.topic,
    description: currentProject.youtube?.description || '',
    tags: (currentProject.youtube?.tags || currentProject.hashtags || []).join(', '),
    privacyStatus: currentProject.youtube?.privacyStatus || 'private',
    publishAt: currentProject.youtube?.scheduledPublishAt ? currentProject.youtube.scheduledPublishAt.slice(0, 16) : ''
  });
  const youtubeUploadStatus = currentProject.youtube?.status || 'not_uploaded';
  const hasYoutubeVideo = Boolean(currentProject.youtube?.videoId || currentProject.youtube?.watchUrl);
  const canStartYoutubeUpload = canDownload
    && youtubeStatus?.connected
    && !uploading
    && youtubeUploadStatus !== 'uploading'
    && youtubeUploadStatus !== 'uploaded'
    && youtubeUploadStatus !== 'scheduled'
    && !hasYoutubeVideo;
  const uploadButtonLabel = youtubeUploadStatus === 'failed'
    ? 'Retry YouTube Upload'
    : uploadForm.publishAt
      ? 'Schedule on YouTube'
      : 'Upload to YouTube';

  const download = async () => {
    const { data } = await api.get(`/download/${currentProject.media.videoFilename}`, { responseType: 'blob' });
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = currentProject.media.videoFilename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const remove = async () => {
    await api.delete(`/shorts/${currentProject._id}`);
    onDeleted?.();
  };

  const pollYoutubeUpload = async () => {
    while (true) {
      const { data } = await api.get(`/shorts/${currentProject._id}`);
      setCurrentProject(data);

      const status = data.youtube?.status;
      if (['uploaded', 'scheduled', 'failed'].includes(status)) {
        if (status === 'failed') {
          setYoutubeError(data.youtube?.errorMessage || 'YouTube upload failed.');
        } else {
          setYoutubeError('');
        }
        onDeleted?.();
        return data;
      }

      await sleep(2500);
    }
  };

  const openReview = async () => {
    setReviewOpen(true);
    setYoutubeError('');
    try {
      const { data } = await api.get('/youtube/status');
      setYoutubeStatus(data);
    } catch (err) {
      setYoutubeError(err.response?.data?.message || 'Could not check YouTube connection.');
    }
  };

  const connectYoutube = async () => {
    setYoutubeError('');
    try {
      const { data } = await api.get('/youtube/auth-url');
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setYoutubeError(err.response?.data?.message || 'Could not start YouTube connection.');
    }
  };

  const generateMetadata = async () => {
    setMetadataLoading(true);
    setYoutubeError('');
    try {
      const { data } = await api.post(`/youtube/metadata/${currentProject._id}`);
      setUploadForm((current) => ({
        ...current,
        title: data.title || current.title,
        description: data.description || current.description,
        tags: (data.tags || []).join(', ')
      }));
    } catch (err) {
      setYoutubeError(err.response?.data?.message || 'Could not generate YouTube SEO metadata.');
    } finally {
      setMetadataLoading(false);
    }
  };

  const uploadToYoutube = async () => {
    if (!canStartYoutubeUpload) return;
    setUploading(true);
    setYoutubeError('');
    try {
      const { data } = await api.post(`/youtube/upload/${currentProject._id}`, {
        ...uploadForm,
        tags: uploadForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        publishAt: uploadForm.publishAt || undefined
      });
      setCurrentProject(data);
      await pollYoutubeUpload();
    } catch (err) {
      setYoutubeError(err.response?.data?.message || 'YouTube upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <article className="glass min-w-0 rounded-[1.5rem] p-4 sm:p-5">
      {canDownload && (
        <div className="mb-5 overflow-hidden rounded-[1.25rem] border border-white/10 bg-black/30">
          <video
            className="mx-auto aspect-[9/16] max-h-[460px] w-full max-w-[240px] bg-black object-cover sm:max-h-[520px] sm:max-w-[260px]"
            controls
            preload="metadata"
            poster={currentProject.media.thumbFilename ? thumbUrl(currentProject.media.thumbFilename) : undefined}
            src={mediaUrl(currentProject.media.videoFilename)}
          />
        </div>
      )}

      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-mint">{currentProject.status}</p>
          <h3 className="mt-2 break-words font-display text-xl font-bold">{currentProject.title || currentProject.topic}</h3>
          <p className="mt-2 text-sm text-frost/60">
            {currentProject.niche} - {currentProject.duration}s - {currentProject.language}
          </p>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
          {currentProject.downloads || 0} downloads
        </span>
      </div>

      {currentProject.hook && <p className="mt-4 text-sm text-frost/75">"{currentProject.hook}"</p>}
      {currentProject.media?.backgroundCredit && (
        <p className="mt-4 break-words text-xs text-frost/50">
          {currentProject.media.backgroundCreditUrl ? (
            <a className="text-mint hover:text-gold" href={currentProject.media.backgroundCreditUrl} rel="noreferrer" target="_blank">
              {currentProject.media.backgroundCredit}
            </a>
          ) : currentProject.media.backgroundCredit}
        </p>
      )}
      {currentProject.errorMessage && <p className="mt-4 rounded-2xl bg-ember/15 p-3 text-sm text-ember">{currentProject.errorMessage}</p>}

      <div className="mt-5 flex flex-wrap gap-3">
        <button className="btn-primary disabled:opacity-40" disabled={!canDownload} onClick={download}>
          <span className="inline-flex items-center gap-2"><Download size={16} /> Download MP4</span>
        </button>
        <button className="btn-muted disabled:opacity-40" disabled={!canDownload} onClick={openReview}>
          <span className="inline-flex items-center gap-2"><UploadCloud size={16} /> Review & Upload</span>
        </button>
        <button className="btn-muted" onClick={remove}>
          <span className="inline-flex items-center gap-2"><Trash2 size={16} /> Delete</span>
        </button>
      </div>

      {youtubeUploadStatus !== 'not_uploaded' && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-frost/70">
          <p><span className="font-bold text-mint">YouTube:</span> {youtubeUploadStatus}</p>
          {youtubeUploadStatus === 'uploading' && <p className="mt-1 text-gold">Uploading to YouTube... do not click again.</p>}
          {youtubeUploadStatus === 'failed' && !hasYoutubeVideo && <p className="mt-1 text-ember">Failed - retry available.</p>}
          {currentProject.youtube.watchUrl && (
            <a className="mt-1 inline-block break-all text-mint hover:text-gold" href={currentProject.youtube.watchUrl} rel="noreferrer" target="_blank">
              {currentProject.youtube.watchUrl}
            </a>
          )}
          {currentProject.youtube.errorMessage && <p className="mt-2 text-ember">{currentProject.youtube.errorMessage}</p>}
        </div>
      )}

      {reviewOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4 backdrop-blur">
          <div className="mx-auto grid max-w-5xl gap-5 rounded-[2rem] border border-white/10 bg-ink p-5 shadow-2xl lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1fr)]">
            <div className="min-w-0">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-display text-2xl font-bold">Review & Upload</h2>
                <button className="btn-muted px-3" onClick={() => setReviewOpen(false)} type="button"><X size={18} /></button>
              </div>
              <div className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-black/30">
                <video
                  className="mx-auto aspect-[9/16] max-h-[620px] w-full max-w-[320px] bg-black object-cover"
                  controls
                  poster={currentProject.media.thumbFilename ? thumbUrl(currentProject.media.thumbFilename) : undefined}
                  src={mediaUrl(currentProject.media.videoFilename)}
                />
              </div>
            </div>

            <div className="grid min-w-0 gap-4">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-frost/70">
                <p><span className="font-bold text-mint">YouTube connection:</span> {youtubeStatus?.connected ? 'Connected' : 'Not connected'}</p>
                {!youtubeStatus?.connected && (
                  <button className="btn-primary mt-3" onClick={connectYoutube} type="button">Connect YouTube</button>
                )}
              </div>

              <button className="btn-muted disabled:opacity-50" disabled={metadataLoading} onClick={generateMetadata} type="button">
                {metadataLoading ? 'Generating SEO...' : 'Generate YouTube SEO'}
              </button>

              <label className="text-sm font-bold text-frost/70">
                Title
                <input className="field mt-2" value={uploadForm.title} onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })} />
              </label>
              <label className="text-sm font-bold text-frost/70">
                Description
                <textarea className="field mt-2 min-h-40" value={uploadForm.description} onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })} />
              </label>
              <label className="text-sm font-bold text-frost/70">
                Keywords / tags
                <input className="field mt-2" value={uploadForm.tags} onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })} />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-bold text-frost/70">
                  Privacy
                  <select className="field mt-2" value={uploadForm.privacyStatus} onChange={(e) => setUploadForm({ ...uploadForm, privacyStatus: e.target.value })}>
                    <option value="private">Private</option>
                    <option value="unlisted">Unlisted</option>
                    <option value="public">Public</option>
                  </select>
                </label>
                <label className="text-sm font-bold text-frost/70">
                  Schedule time
                  <input className="field mt-2" type="datetime-local" value={uploadForm.publishAt} onChange={(e) => setUploadForm({ ...uploadForm, publishAt: e.target.value })} />
                </label>
              </div>

              {uploadForm.publishAt && <p className="text-sm text-frost/60">Scheduled uploads will be sent as private first because YouTube requires private status for publishAt.</p>}
              {youtubeError && <p className="rounded-2xl bg-ember/15 p-3 text-sm text-ember">{youtubeError}</p>}
              <p className="rounded-2xl border border-gold/20 bg-gold/10 p-3 text-sm text-frost/70">
                YouTube may show this under Videos while it is pending or processing. Since this file is vertical and short-form, YouTube can classify it as a Short after processing.
              </p>
              {currentProject.youtube?.watchUrl && (
                <a className="break-all rounded-2xl bg-mint/10 p-3 text-sm text-mint hover:text-gold" href={currentProject.youtube.watchUrl} rel="noreferrer" target="_blank">
                  {currentProject.youtube.watchUrl}
                </a>
              )}

              <button className="btn-primary disabled:opacity-50" disabled={!canStartYoutubeUpload} onClick={uploadToYoutube} type="button">
                {uploading || youtubeUploadStatus === 'uploading' ? 'Uploading to YouTube...' : uploadButtonLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
