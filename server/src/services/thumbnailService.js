import path from 'path';
import slugify from 'slugify';
import { storageDirs } from '../utils/storage.js';
import { runFfmpeg } from '../utils/ffmpeg.js';

function safeDrawtext(text) {
  return String(text).replace(/[:'\\]/g, ' ').slice(0, 64);
}

export async function generateThumbnail(title) {
  const filename = `${Date.now()}-${slugify(title || 'thumbnail', { lower: true, strict: true })}.jpg`;
  const outputPath = path.join(storageDirs.thumbs, filename);
  const text = safeDrawtext(title);
  const filter = `drawtext=text='${text}':fontcolor=white:fontsize=72:borderw=5:bordercolor=black:x=(w-text_w)/2:y=(h-text_h)/2`;

  await runFfmpeg([
    '-y',
    '-f',
    'lavfi',
    '-i',
    'color=c=#07111f:s=1080x1920:d=1',
    '-vf',
    filter,
    '-frames:v',
    '1',
    outputPath
  ], { timeout: 60000 });

  return { filename, path: outputPath };
}
