import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import axios from 'axios';
import slugify from 'slugify';
import { storageDirs } from '../utils/storage.js';
import { buildSceneQueries } from './themeTemplateService.js';

const PEXELS_VIDEO_SEARCH_URL = 'https://api.pexels.com/videos/search';

function isPexelsEnabled() {
  return process.env.PEXELS_ENABLED !== 'false' && Boolean(process.env.PEXELS_API_KEY);
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

function pickBestVideo(videos, duration, usedIds) {
  return [...videos]
    .map((video) => ({ video, file: chooseVideoFile(video) }))
    .filter(({ video, file }) => file && !usedIds.has(String(video.id)))
    .sort((a, b) => {
      const aPortrait = a.file.height > a.file.width ? 1 : 0;
      const bPortrait = b.file.height > b.file.width ? 1 : 0;
      const aDuration = a.video.duration >= duration ? 1 : 0;
      const bDuration = b.video.duration >= duration ? 1 : 0;
      return bPortrait - aPortrait || bDuration - aDuration || scoreVideoFile(b.file) - scoreVideoFile(a.file);
    })[0];
}

async function searchVideos(query) {
  const { data } = await axios.get(PEXELS_VIDEO_SEARCH_URL, {
    headers: { Authorization: process.env.PEXELS_API_KEY },
    params: {
      query,
      orientation: 'portrait',
      size: 'medium',
      per_page: 12
    },
    timeout: 15000
  });

  return data.videos || [];
}

async function downloadSelectedVideo({ selected, safeTopic, segmentIndex }) {
  await fs.mkdir(storageDirs.downloadedBackgrounds, { recursive: true });

  const filename = `${Date.now()}-pexels-${selected.video.id}-${safeTopic}-${segmentIndex + 1}.mp4`;
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
    creditUrl: selected.video.user?.url || selected.video.url,
    segmentIndex
  };
}

export async function findAndDownloadPexelsBackgrounds({ input, generated }) {
  if (!isPexelsEnabled()) return [];

  const sceneQueries = buildSceneQueries({ input, generated });
  if (!sceneQueries.length) return [];

  const usedIds = new Set();
  const clips = [];

  for (const scene of sceneQueries) {
    try {
      const videos = await searchVideos(scene.query);
      const selected = pickBestVideo(videos, input.duration, usedIds);
      if (!selected) continue;

      usedIds.add(String(selected.video.id));
      const safeTopic = slugify(input.topic || scene.query || 'pexels-background', { lower: true, strict: true });
      clips.push(await downloadSelectedVideo({
        selected,
        safeTopic,
        segmentIndex: scene.segmentIndex
      }));
    } catch (error) {
      console.warn(`Pexels clip skipped for scene ${scene.segmentIndex + 1}: ${error.message}`);
    }
  }

  return clips.sort((a, b) => a.segmentIndex - b.segmentIndex);
}

export async function findAndDownloadPexelsBackground(input) {
  const clips = await findAndDownloadPexelsBackgrounds({
    input,
    generated: {
      hook: input.topic,
      fullScript: input.topic,
      cta: input.topic
    }
  });

  return clips[0] || null;
}
