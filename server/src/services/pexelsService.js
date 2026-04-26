import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import axios from 'axios';
import slugify from 'slugify';
import { storageDirs } from '../utils/storage.js';

const PEXELS_VIDEO_SEARCH_URL = 'https://api.pexels.com/v1/videos/search';

function isPexelsEnabled() {
  return process.env.PEXELS_ENABLED !== 'false' && Boolean(process.env.PEXELS_API_KEY);
}

function buildSearchQuery({ topic, niche, tone }) {
  return [topic, niche, tone]
    .filter(Boolean)
    .join(' ')
    .replace(/[^\w\s/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreVideoFile(file) {
  if (file.file_type !== 'video/mp4') return -1;

  const portraitScore = file.height > file.width ? 1000 : 0;
  const qualityScore = file.quality === 'hd' ? 200 : file.quality === 'sd' ? 100 : 0;
  const sizeScore = Math.min(Number(file.height || 0), 1920);

  return portraitScore + qualityScore + sizeScore;
}

function chooseVideoFile(video) {
  return [...(video.video_files || [])]
    .filter((file) => file.link && file.file_type === 'video/mp4')
    .sort((a, b) => scoreVideoFile(b) - scoreVideoFile(a))[0];
}

function chooseVideo(videos, duration) {
  return [...videos]
    .map((video) => ({ video, file: chooseVideoFile(video) }))
    .filter(({ file }) => file)
    .sort((a, b) => {
      const aPortrait = a.file.height > a.file.width ? 1 : 0;
      const bPortrait = b.file.height > b.file.width ? 1 : 0;
      const aDuration = a.video.duration >= duration ? 1 : 0;
      const bDuration = b.video.duration >= duration ? 1 : 0;
      return bPortrait - aPortrait || bDuration - aDuration || scoreVideoFile(b.file) - scoreVideoFile(a.file);
    })[0];
}

export async function findAndDownloadPexelsBackground(input) {
  if (!isPexelsEnabled()) return null;

  const query = buildSearchQuery(input);
  if (!query) return null;

  try {
    const { data } = await axios.get(PEXELS_VIDEO_SEARCH_URL, {
      headers: { Authorization: process.env.PEXELS_API_KEY },
      params: {
        query,
        orientation: 'portrait',
        size: 'medium',
        per_page: 8
      },
      timeout: 15000
    });

    const selected = chooseVideo(data.videos || [], input.duration);
    if (!selected) return null;

    await fs.mkdir(storageDirs.downloadedBackgrounds, { recursive: true });

    const safeTopic = slugify(input.topic || query || 'pexels-background', { lower: true, strict: true });
    const filename = `${Date.now()}-pexels-${selected.video.id}-${safeTopic}.mp4`;
    const outputPath = path.join(storageDirs.downloadedBackgrounds, filename);

    const download = await axios.get(selected.file.link, {
      responseType: 'stream',
      timeout: 30000
    });

    await pipeline(download.data, createWriteStream(outputPath));

    const creator = selected.video.user?.name || 'Pexels creator';
    return {
      path: outputPath,
      filename,
      provider: 'pexels',
      sourceUrl: selected.video.url,
      credit: `Background video by ${creator} on Pexels`,
      creditUrl: selected.video.user?.url || selected.video.url
    };
  } catch (error) {
    console.warn(`Pexels background skipped: ${error.message}`);
    return null;
  }
}
