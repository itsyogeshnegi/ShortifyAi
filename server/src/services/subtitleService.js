import fs from 'fs/promises';
import path from 'path';
import slugify from 'slugify';
import { storageDirs } from '../utils/storage.js';

function escapeAss(text) {
  return text.replace(/[{}]/g, '').replace(/\n/g, '\\N');
}

function timestamp(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

export async function createSubtitleFile(scriptText, duration, title) {
  const filename = `${Date.now()}-${slugify(title || 'captions', { lower: true, strict: true })}.ass`;
  const outputPath = path.join(storageDirs.temp, filename);
  const words = scriptText.split(/\s+/).filter(Boolean);
  const chunks = [];
  const perChunk = Math.max(6, Math.ceil(words.length / Math.max(3, duration / 4)));

  for (let i = 0; i < words.length; i += perChunk) {
    chunks.push(words.slice(i, i + perChunk).join(' '));
  }

  const body = chunks
    .map((chunk, index) => {
      const start = (duration / chunks.length) * index;
      const end = (duration / chunks.length) * (index + 1);
      return `Dialogue: 0,${timestamp(start)},${timestamp(end)},Default,,0,0,0,,${escapeAss(chunk)}`;
    })
    .join('\n');

  const ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,64,&H00FFFFFF,&H000000FF,&H00101010,&HAA000000,-1,0,0,0,100,100,0,0,1,4,1,2,90,90,250,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${body}
`;

  await fs.writeFile(outputPath, ass, 'utf8');
  return { filename, path: outputPath };
}
