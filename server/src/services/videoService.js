import fs from 'fs/promises';
import path from 'path';
import slugify from 'slugify';
import { storageDirs } from '../utils/storage.js';
import { createSubtitleFile } from './subtitleService.js';
import { runFfmpeg } from '../utils/ffmpeg.js';
import { createVisualTheme } from './visualThemeService.js';
import { createSoundEffectsTrack } from './soundDesignService.js';

async function getLogoPath() {
  const candidates = [
    path.resolve('server/src/utils/logo/logo.png'),
    path.resolve('src/utils/logo/logo.png'),
    path.resolve('server/src/assets/logo.png'),
    path.resolve('src/assets/logo.png')
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Check next candidate
    }
  }

  return null;
}

async function pickBackground() {
  const files = await fs.readdir(storageDirs.backgrounds);
  const videos = files.filter((file) => /\.(mp4|mov|mkv|webm)$/i.test(file));
  return videos.length ? [path.join(storageDirs.backgrounds, videos[0])] : [];
}

function normalizePathForFilter(filePath) {
  return filePath.replace(/\\/g, '/').replace(/:/g, '\\:');
}

function segmentDurations(duration, count) {
  const base = duration / count;
  return Array.from({ length: count }, (_, index) => (
    index === count - 1 ? Number((duration - (base * (count - 1))).toFixed(3)) : Number(base.toFixed(3))
  ));
}

function buildSceneSlots({ clipPaths, sceneCount }) {
  return Array.from({ length: sceneCount }, (_, index) => {
    const clipPath = clipPaths.length > 0 ? clipPaths[index % clipPaths.length] : null;
    return {
      type: clipPath ? 'clip' : 'visual',
      path: clipPath
    };
  });
}

function buildVideoInputs({ sceneSlots, visualTheme }) {
  return sceneSlots.flatMap((slot) => (
    slot.type === 'clip'
      ? ['-stream_loop', '-1', '-i', slot.path]
      : ['-f', 'lavfi', '-i', visualTheme.source]
  ));
}

function buildVideoSegmentFilter({ inputIndex, duration, visualTheme, slot }) {
  const base = slot.type === 'clip'
    ? `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,trim=duration=${duration},setpts=PTS-STARTPTS`
    : `${visualTheme.filters},trim=duration=${duration},setpts=PTS-STARTPTS`;

  return `[${inputIndex}:v]${base}[seg${inputIndex}]`;
}

function buildAudioFilter({ voiceIndex, ambientIndex, sfxIndex, duration }) {
  const fadeOutStart = Math.max(0.2, duration - 1.0);
  return [
    `[${voiceIndex}:a]volume=1.0,aresample=44100,apad=pad_dur=${duration},atrim=duration=${duration},acompressor=threshold=-16dB:ratio=2.2:attack=15:release=180,asetpts=PTS-STARTPTS[voice]`,
    `[${ambientIndex}:a]volume=0.18,aresample=44100,atrim=duration=${duration},afade=t=in:st=0:d=0.5,afade=t=out:st=${fadeOutStart}:d=0.8,asetpts=PTS-STARTPTS[bed]`,
    `[${sfxIndex}:a]volume=0.45,aresample=44100,atrim=duration=${duration},asetpts=PTS-STARTPTS[sfx]`,
    `[voice][bed][sfx]amix=inputs=3:weights='1 0.85 0.9':normalize=0:duration=longest[aout]`
  ].join(';');
}

function buildFilterComplex({ sceneSlots, segmentTimes, subtitlePath, duration, watermarkLogo, visualTheme }) {
  const sceneCount = sceneSlots.length;
  const videoFilters = Array.from({ length: sceneCount }, (_, index) => buildVideoSegmentFilter({
    inputIndex: index,
    duration: segmentTimes[index],
    visualTheme,
    slot: sceneSlots[index]
  }));
  const concatInputs = Array.from({ length: sceneCount }, (_, index) => `[seg${index}]`).join('');
  const subtitleFilter = `ass='${normalizePathForFilter(subtitlePath)}'`;
  const fadeOutStart = Math.max(1, duration - 0.4);

  const filters = [
    ...videoFilters,
    `${concatInputs}concat=n=${sceneCount}:v=1:a=0[vstack]`,
    `[vstack]${subtitleFilter},fade=t=in:st=0:d=0.4,fade=t=out:st=${fadeOutStart}:d=0.4[vsub]`
  ];

  const voiceIndex = sceneCount;
  const ambientIndex = sceneCount + 1;
  const sfxIndex = sceneCount + 2;
  filters.push(buildAudioFilter({ voiceIndex, ambientIndex, sfxIndex, duration }));

  if (watermarkLogo) {
    filters.push(`[${sfxIndex + 1}:v]format=rgba,scale=130:-1,colorchannelmixer=aa=0.85[logo]`);
    filters.push(`[vsub][logo]overlay=W-w-36:36:format=auto[vout]`);
  } else {
    filters.push('[vsub]null[vout]');
  }

  return filters.join(';');
}

export async function generateShortVideo({
  title,
  scriptText,
  subtitleTimeline = [],
  duration,
  speechDuration,
  audioPath,
  ambientAudioPath,
  topic,
  niche,
  tone,
  themeTemplate,
  backgroundPaths = [],
  sceneCount: requestedSceneCount
}) {
  const filename = `${Date.now()}-${slugify(title || 'shortifyai-video', { lower: true, strict: true })}.mp4`;
  const outputPath = path.join(storageDirs.videos, filename);
  const subtitle = await createSubtitleFile(scriptText, speechDuration || duration, title, subtitleTimeline);
  const sfxTrack = await createSoundEffectsTrack({
    title,
    duration,
    themeTemplate,
    niche,
    cueTimeline: subtitle.timeline
  });
  const watermarkLogo = await getLogoPath();
  const visualTheme = createVisualTheme({ topic, niche, tone, duration, themeTemplate });
  const pickedBackgrounds = backgroundPaths.length > 0 ? backgroundPaths : await pickBackground();
  const sceneCount = requestedSceneCount || (Number(duration) === 15 ? 3 : Number(duration) === 30 ? 5 : 7);
  const sceneSlots = buildSceneSlots({ clipPaths: pickedBackgrounds, sceneCount });
  const segmentTimes = segmentDurations(duration, sceneCount);
  const sourceArgs = buildVideoInputs({ sceneSlots, visualTheme });

  const args = [
    '-y',
    ...sourceArgs,
    '-i',
    audioPath,
    '-i',
    ambientAudioPath,
    '-i',
    sfxTrack.path
  ];

  if (watermarkLogo) {
    args.push('-i', watermarkLogo);
  }

  args.push(
    '-filter_complex',
    buildFilterComplex({
      sceneSlots,
      segmentTimes,
      subtitlePath: subtitle.path,
      duration,
      watermarkLogo,
      visualTheme
    }),
    '-map',
    '[vout]',
    '-map',
    '[aout]',
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
    '-fps_mode',
    'cfr',
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
  );

  try {
    await runFfmpeg(args, { timeout: 240000 });
    return { filename, path: outputPath, subtitleFilename: subtitle.filename };
  } finally {
    await sfxTrack.cleanup().catch(() => {});
  }
}
