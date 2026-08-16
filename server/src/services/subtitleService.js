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

function splitIntoChunks(scriptText) {
  const phrases = String(scriptText || '')
    .replace(/\.\.\./g, '. ')
    .split(/(?<=[.!?])\s+|,\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const chunks = [];
  for (const phrase of phrases) {
    const words = phrase.split(/\s+/).filter(Boolean);
    if (words.length <= 6) {
      chunks.push(phrase);
      continue;
    }

    for (let index = 0; index < words.length; index += 5) {
      chunks.push(words.slice(index, index + 5).join(' '));
    }
  }

  return chunks.length ? chunks : [String(scriptText || '').trim()].filter(Boolean);
}

function buildSubtitleTimeline(scriptText, duration) {
  const chunks = splitIntoChunks(scriptText);
  if (!chunks.length) return [];

  const weights = chunks.map((chunk) => {
    const wordCount = chunk.split(/\s+/).filter(Boolean).length;
    const charCount = chunk.length;
    return wordCount * 1.8 + charCount;
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const speechDuration = Math.max(1, Number(duration) - 0.25);

  let currentStart = 0;
  return chunks.map((chunk, index) => {
    const chunkDur = (weights[index] / totalWeight) * speechDuration;
    const start = currentStart;
    const end = Math.min(duration, start + chunkDur);
    currentStart = end;
    return {
      text: chunk,
      start: Number(start.toFixed(2)),
      end: Number(end.toFixed(2))
    };
  });
}

export async function createSubtitleFile(scriptText, duration, title, timedTimeline = []) {
  const filename = `${Date.now()}-${slugify(title || 'captions', { lower: true, strict: true })}.ass`;
  const outputPath = path.join(storageDirs.temp, filename);
  const timeline = timedTimeline.length ? timedTimeline : buildSubtitleTimeline(scriptText, duration);

  const body = timeline
    .map((chunk) => {
      return `Dialogue: 0,${timestamp(chunk.start)},${timestamp(chunk.end)},Default,,0,0,0,,${escapeAss(chunk.text)}`;
    })
    .join('\n');

  const ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial Black,74,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,6,2,2,90,90,320,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${body}
`;

  await fs.writeFile(outputPath, ass, 'utf8');
  return { filename, path: outputPath, timeline };
}
