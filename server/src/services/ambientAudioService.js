import path from 'path';
import slugify from 'slugify';
import { runFfmpeg } from '../utils/ffmpeg.js';
import { storageDirs, safeUnlink } from '../utils/storage.js';
import { resolveThemeTemplate } from './themeTemplateService.js';

function buildAmbientSource({ frequencies, pulse, duration }) {
  const [base, middle, top] = frequencies;
  const motionPulse = Number((pulse * 1.6).toFixed(3));
  return [
    `0.16*sin(2*PI*${base}*t)`,
    `0.11*sin(2*PI*${middle}*t)`,
    `0.07*sin(2*PI*${top}*t)`,
    `0.04*sin(2*PI*${base / 2}*t)*sin(2*PI*${motionPulse}*t)`,
    `0.02*sin(2*PI*${base * 2}*t)*sin(2*PI*${motionPulse * 0.5}*t)`
  ].join('+');
}

export async function createAmbientBed({ themeTemplate, niche, duration, title }) {
  const template = resolveThemeTemplate(themeTemplate, niche);
  const filename = `${Date.now()}-${slugify(title || template.id || 'ambient-bed', { lower: true, strict: true })}-bed.wav`;
  const outputPath = path.join(storageDirs.temp, filename);
  const source = buildAmbientSource({ ...template.ambient, duration });

  const args = [
    '-y',
    '-f',
    'lavfi',
    '-i',
    `aevalsrc=${source}:s=44100:d=${duration}`,
    '-af',
    `lowpass=f=1200,highpass=f=65,acompressor=threshold=-20dB:ratio=2:attack=20:release=180,afade=t=in:st=0:d=0.5,afade=t=out:st=${Math.max(0.2, duration - 1.0)}:d=0.8`,
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
