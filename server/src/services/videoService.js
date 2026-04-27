import fs from 'fs/promises';
import path from 'path';
import slugify from 'slugify';
import { storageDirs } from '../utils/storage.js';
import { createSubtitleFile } from './subtitleService.js';
import { runFfmpeg } from '../utils/ffmpeg.js';
import { createVisualTheme } from './visualThemeService.js';

const logoPath = path.resolve('src/utils/logo/logo.png');

async function pickBackground() {
  const files = await fs.readdir(storageDirs.backgrounds);
  const videos = files.filter((file) => /\.(mp4|mov|mkv|webm)$/i.test(file));
  return videos.length ? path.join(storageDirs.backgrounds, videos[0]) : null;
}

async function getLogoPath() {
  try {
    await fs.access(logoPath);
    return logoPath;
  } catch {
    return null;
  }
}

function normalizePathForFilter(filePath) {
  return filePath.replace(/\\/g, '/').replace(/:/g, '\\:');
}

function buildVideoFilters({ baseFilters, subtitleFilter, duration, hasLogo }) {
  const fadeOutStart = Math.max(1, duration - 0.4);
  const mainFilters = `${baseFilters},${subtitleFilter},fade=t=in:st=0:d=0.4,fade=t=out:st=${fadeOutStart}:d=0.4`;

  if (!hasLogo) return { simpleFilter: mainFilters };

  return {
    complexFilter: `[0:v]${mainFilters}[base];[2:v]format=rgba,scale=130:-1,colorchannelmixer=aa=0.85[logo];[base][logo]overlay=36:36:format=auto[vout]`
  };
}

export async function generateShortVideo({ title, scriptText, duration, audioPath, topic, niche, tone, backgroundPath }) {
  const filename = `${Date.now()}-${slugify(title || 'shortifyai-video', { lower: true, strict: true })}.mp4`;
  const outputPath = path.join(storageDirs.videos, filename);
  const subtitle = await createSubtitleFile(scriptText, duration, title);
  const background = backgroundPath || await pickBackground();
  const watermarkLogo = await getLogoPath();
  const subtitleFilter = `ass='${normalizePathForFilter(subtitle.path)}'`;

  const visualTheme = createVisualTheme({ topic, niche, tone, duration });
  const sourceArgs = background
    ? [
        '-y',
        '-stream_loop',
        '-1',
        '-i',
        background,
        '-i',
        audioPath,
        '-t',
        String(duration)
      ]
    : [
        '-y',
        '-f',
        'lavfi',
        '-i',
        visualTheme.source,
        '-i',
        audioPath,
        '-t',
        String(duration)
      ];

  const baseFilters = background
    ? 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920'
    : visualTheme.filters;

  const { simpleFilter, complexFilter } = buildVideoFilters({
    baseFilters,
    subtitleFilter,
    duration,
    hasLogo: Boolean(watermarkLogo)
  });

  const filterArgs = watermarkLogo
    ? [
        '-i',
        watermarkLogo,
        '-filter_complex',
        complexFilter,
        '-map',
        '[vout]',
        '-map',
        '1:a:0'
      ]
    : [
        '-vf',
        simpleFilter,
        '-map',
        '0:v:0',
        '-map',
        '1:a:0'
      ];

  const args = [
    ...sourceArgs,
    ...filterArgs,
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '23',
    '-maxrate',
    '8M',
    '-bufsize',
    '16M',
    '-r',
    '30',
    '-c:a',
    'aac',
    '-ar',
    '44100',
    '-b:a',
    '128k',
    '-shortest',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    outputPath
  ];

  await runFfmpeg(args, { timeout: 180000 });
  return { filename, path: outputPath, subtitleFilename: subtitle.filename };
}
