import path from 'path';
import slugify from 'slugify';
import { runFfmpeg } from '../utils/ffmpeg.js';
import { storageDirs, safeUnlink } from '../utils/storage.js';
import { resolveThemeTemplate } from './themeTemplateService.js';

function classifyAccent(themeTemplate, niche) {
  const template = resolveThemeTemplate(themeTemplate, niche);
  if (['ai-tech', 'facts-knowledge'].includes(template.id)) return 'digital';
  if (['money-success', 'crypto-finance'].includes(template.id)) return 'cash';
  return 'lift';
}

function buildWhooshCue(index, delayMs) {
  return {
    input: ['-f', 'lavfi', '-i', 'anoisesrc=color=white:amplitude=0.4:d=0.16:r=44100'],
    filter: `[${index}:a]highpass=f=500,lowpass=f=4500,volume=0.26,afade=t=in:st=0:d=0.01,afade=t=out:st=0.06:d=0.10,adelay=${delayMs}|${delayMs}[fx${index}]`
  };
}

function buildAccentCue(index, delayMs, accentType) {
  if (accentType === 'digital') {
    return {
      input: ['-f', 'lavfi', '-i', 'sine=frequency=940:duration=0.10:sample_rate=44100'],
      filter: `[${index}:a]volume=0.22,afade=t=in:st=0:d=0.01,afade=t=out:st=0.05:d=0.05,adelay=${delayMs}|${delayMs}[fx${index}]`
    };
  }

  if (accentType === 'cash') {
    return {
      input: ['-f', 'lavfi', '-i', 'sine=frequency=1320:duration=0.14:sample_rate=44100'],
      filter: `[${index}:a]volume=0.18,afade=t=in:st=0:d=0.01,afade=t=out:st=0.07:d=0.07,adelay=${delayMs}|${delayMs}[fx${index}]`
    };
  }

  return {
    input: ['-f', 'lavfi', '-i', 'aevalsrc=0.24*sin(2*PI*(220+420*t)*t):s=44100:d=0.18'],
    filter: `[${index}:a]volume=0.18,afade=t=in:st=0:d=0.01,afade=t=out:st=0.09:d=0.09,adelay=${delayMs}|${delayMs}[fx${index}]`
  };
}

export async function createSoundEffectsTrack({ title, duration, themeTemplate, niche, cueTimeline = [] }) {
  const cues = cueTimeline.filter((cue) => Number.isFinite(cue.start)).slice(0, 14);
  const filename = `${Date.now()}-${slugify(title || 'short-sfx', { lower: true, strict: true })}-sfx.wav`;
  const outputPath = path.join(storageDirs.temp, filename);

  if (!cues.length) {
    return { path: null, filename: null, cleanup: async () => {} };
  }

  const accentType = classifyAccent(themeTemplate, niche);
  const inputs = [];
  const filters = [];
  const labels = [];
  let inputIndex = 0;

  cues.forEach((cue, cueIndex) => {
    const delayMs = Math.max(0, Math.round(cue.start * 1000));
    const whoosh = buildWhooshCue(inputIndex, delayMs);
    inputs.push(...whoosh.input);
    filters.push(whoosh.filter);
    labels.push(`[fx${inputIndex}]`);
    inputIndex += 1;

    if (cueIndex % 2 === 0) {
      const accent = buildAccentCue(inputIndex, delayMs, accentType);
      inputs.push(...accent.input);
      filters.push(accent.filter);
      labels.push(`[fx${inputIndex}]`);
      inputIndex += 1;
    }
  });

  filters.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0:duration=longest,atrim=duration=${duration}[mix]`);

  const args = [
    '-y',
    ...inputs,
    '-filter_complex',
    filters.join(';'),
    '-map',
    '[mix]',
    '-c:a',
    'pcm_s16le',
    outputPath
  ];

  await runFfmpeg(args, { timeout: 60000 });

  return {
    path: outputPath,
    filename,
    cleanup: () => safeUnlink(outputPath)
  };
}
