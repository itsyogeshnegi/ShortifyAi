import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import axios from 'axios';
import { runFfmpeg } from '../utils/ffmpeg.js';
import { storageDirs } from '../utils/storage.js';

const PEXELS_PHOTO_SEARCH_URL = 'https://api.pexels.com/v1/search';
const DEFAULT_PEXELS_KEY = process.env.PEXELS_API_KEY || '563492ad6f9170000100000155b4122d26d744b6b663b018590c4273';
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

function normalizePathForFilter(filePath) {
  return filePath.replace(/\\/g, '/').replace(/:/g, '\\:');
}

function parseJsonFromText(text) {
  const clean = String(text || '')
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    const repaired = match[0].replace(/,\s*([}\]])/g, '$1');
    try {
      return JSON.parse(repaired);
    } catch {
      return null;
    }
  }
}

export function getDynamicNicheCoverQueries({ topic, niche, title, hook, index = 0 }) {
  const cleanTopic = String(topic || title || '').replace(/[^\w\s]/g, '').trim();
  const nicheLower = String(niche || '').toLowerCase();

  // 1. RELATIONSHIPS / DATING / LOVE / PSYCHOLOGY / EMOTIONAL
  if (
    nicheLower.includes('relation') ||
    nicheLower.includes('love') ||
    nicheLower.includes('dating') ||
    nicheLower.includes('emotion') ||
    nicheLower.includes('couple')
  ) {
    return [
      `${cleanTopic} romantic couple intimacy`,
      `romantic couple aesthetic portrait`,
      `attractive couple love passion aesthetic`,
      `couple emotional connection aesthetic`,
      `couple holding hands romantic sunset`,
      `dating relationship couple model aesthetic`
    ];
  }

  // 2. MONEY / SUCCESS / WEALTH / FINANCE / CRYPTO / BUSINESS / FIRE
  if (
    nicheLower.includes('money') ||
    nicheLower.includes('success') ||
    nicheLower.includes('wealth') ||
    nicheLower.includes('finance') ||
    nicheLower.includes('crypto') ||
    nicheLower.includes('business')
  ) {
    return [
      `${cleanTopic} luxury lifestyle wealth`,
      `wealthy successful lifestyle luxury mansion supercar`,
      `modern businessman executive luxury office skyscraper`,
      `financial freedom luxury rich lifestyle`,
      `stock market growth trading chart crypto luxury`,
      `luxury watch gold cash wealth lifestyle`
    ];
  }

  // 3. MOTIVATION / DISCIPLINE / MINDSET / LIFE LESSONS
  if (
    nicheLower.includes('motivat') ||
    nicheLower.includes('mindset') ||
    nicheLower.includes('discipline') ||
    nicheLower.includes('lesson')
  ) {
    return [
      `${cleanTopic} focused discipline aesthetic`,
      `sunrise mountain summit victory success`,
      `intense focused athlete discipline`,
      `deep thinker solitary silhouette sunset`,
      `dark aesthetic stoic statue philosophy mindset`
    ];
  }

  // 4. FITNESS / BODYBUILDING / GYM / HEALTH
  if (
    nicheLower.includes('fit') ||
    nicheLower.includes('bodybuild') ||
    nicheLower.includes('gym') ||
    nicheLower.includes('workout') ||
    nicheLower.includes('health')
  ) {
    return [
      `${cleanTopic} gym workout athlete`,
      `muscular aesthetic fitness training gym`,
      `intense athlete workout power training`,
      `athletic fitness model physique aesthetic`,
      `healthy lifestyle runner sunrise workout`
    ];
  }

  // 5. AI / TECH / CODING / FUTURE
  if (
    nicheLower.includes('ai') ||
    nicheLower.includes('tech') ||
    nicheLower.includes('code') ||
    nicheLower.includes('cyber') ||
    nicheLower.includes('future')
  ) {
    return [
      `${cleanTopic} futuristic technology cyber`,
      `artificial intelligence digital interface holographic`,
      `futuristic cyber aesthetic data code neon`,
      `modern technology developer neon workspace`,
      `robot artificial intelligence humanoid cyber`
    ];
  }

  // 6. FACTS / KNOWLEDGE / SCIENCE / HISTORY
  if (
    nicheLower.includes('fact') ||
    nicheLower.includes('know') ||
    nicheLower.includes('science') ||
    nicheLower.includes('history')
  ) {
    return [
      `${cleanTopic} documentary cinematic visual`,
      `mysterious deep cosmos galaxy universe science`,
      `ancient architecture history mystery`,
      `fascinating science laboratory discovery concept`
    ];
  }

  // 7. DEFAULT / TOPIC DRIVEN
  return [
    `${cleanTopic} luxury lifestyle aesthetic`,
    `${cleanTopic} cinematic high quality aesthetic`,
    `${cleanTopic} professional high resolution photography`
  ];
}

export async function fetchPexelsStockPhoto({ topic, niche, title, hook, index = 0, outputPath }) {
  const apiKey = process.env.PEXELS_API_KEY || DEFAULT_PEXELS_KEY;
  const queries = getDynamicNicheCoverQueries({ topic, niche, title, hook, index });

  for (const term of queries) {
    if (!term) continue;
    try {
      const { data } = await axios.get(PEXELS_PHOTO_SEARCH_URL, {
        headers: { Authorization: apiKey },
        params: {
          query: term,
          orientation: 'portrait',
          per_page: 15
        },
        timeout: 15000
      });

      const photos = data?.photos || [];
      if (photos.length > 0) {
        const photo = photos[index % photos.length];
        const photoUrl = photo?.src?.large2x || photo?.src?.original || photo?.src?.large;

        if (photoUrl) {
          const download = await axios.get(photoUrl, { responseType: 'stream', timeout: 30000 });
          await pipeline(download.data, createWriteStream(outputPath));
          return true;
        }
      }
    } catch {
      // Try next niche search query
    }
  }
  return false;
}

export async function generateCoverHeadlines(project) {
  const baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'gemma4:31b-cloud';
  const script = project.script || {};

  const prompt = `
You are an expert Instagram Reel Cover designer.
Extract 2 distinct short cover headlines from this Reel.
Each headline MUST be 3 to 5 words max, uppercase, viral, and punchy.

Return only valid JSON with this exact shape:
{
  "headlines": [
    "PUNCHY HOOK HEADLINE",
    "CORE SECRET INSIGHT"
  ]
}

Reel Topic: ${project.topic || project.title}
Title: ${project.title}
Hook: ${project.hook}
Script: ${script.fullScript || ''}
`;

  try {
    const { data } = await axios.post(
      `${baseURL}/api/generate`,
      { model, prompt, stream: false, format: 'json' },
      { timeout: 90000 }
    );

    const parsed = typeof data.response === 'string' ? parseJsonFromText(data.response) : data.response;
    if (Array.isArray(parsed?.headlines) && parsed.headlines.length >= 2) {
      return parsed.headlines.slice(0, 2).map((h) => String(h).toUpperCase().trim());
    }
  } catch {
    // Fallback to title & topic
  }

  const topicUpper = String(project.topic || project.title || 'VIRAL REEL').toUpperCase();
  const hookUpper = String(project.hook || project.title || 'MUST WATCH').toUpperCase();

  return [
    hookUpper.slice(0, 35),
    `THE SECRET TO ${topicUpper.slice(0, 22)}`
  ];
}

export async function extractVideoFrame({ videoPath, timestamp, outputPath }) {
  await runFfmpeg([
    '-y',
    '-ss',
    String(timestamp),
    '-i',
    videoPath,
    '-vframes',
    '1',
    '-q:v',
    '2',
    outputPath
  ]);
}

function formatHeadlineForCover(text, maxCharsPerLine = 16) {
  const words = String(text || '').toUpperCase().trim().split(/\s+/);
  const lines = [];
  let current = [];

  for (const word of words) {
    if ((current.join(' ') + ' ' + word).trim().length <= maxCharsPerLine) {
      current.push(word);
    } else {
      if (current.length) lines.push(current.join(' '));
      current = [word];
    }
  }
  if (current.length) lines.push(current.join(' '));
  return lines.slice(0, 2).join('\n');
}

async function getSystemFontOption() {
  const candidates = [
    'C:/Windows/Fonts/arialbd.ttf',
    'C:/Windows/Fonts/impact.ttf',
    'C:/Windows/Fonts/segoeuib.ttf',
    'C:/Windows/Fonts/arial.ttf'
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return `:fontfile='${normalizePathForFilter(candidate)}'`;
    } catch {}
  }
  return '';
}

export async function compositeReelCover({ framePath, headline, style, logo, outputPath }) {
  const fontOpt = await getSystemFontOption();
  const cleanHeadline = String(headline || '')
    .toUpperCase()
    .replace(/[^\w\s\u0900-\u097F]/g, '')
    .trim();

  const formattedHeadline = formatHeadlineForCover(cleanHeadline);
  const escapedHeadline = formattedHeadline.replace(/'/g, "'\\\\''").replace(/:/g, '\\:');

  let filterComplex = '';

  if (style === 'viral_hook') {
    // Style 1: High-Impact Gold Bold Typography (Bottom-Center Safe Position)
    filterComplex = [
      `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[bg]`,
      `[bg]drawtext=text='${escapedHeadline}'${fontOpt}:fontcolor=0xFFD700:fontsize=72:line_spacing=24:x=(w-text_w)/2:y=h-text_h-60:box=1:boxcolor=black@0.70:boxborderw=32:borderw=4:bordercolor=black[vtxt]`
    ].join(';');
  } else {
    // Style 2: Ultra-Clean Crisp White Bold Typography (Bottom-Center Safe Position)
    filterComplex = [
      `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[bg]`,
      `[bg]drawtext=text='${escapedHeadline}'${fontOpt}:fontcolor=white:fontsize=72:line_spacing=24:x=(w-text_w)/2:y=h-text_h-60:box=1:boxcolor=black@0.70:boxborderw=32:borderw=4:bordercolor=black[vtxt]`
    ].join(';');
  }

  const inputs = ['-y', '-i', framePath];
  if (logo) {
    inputs.push('-i', logo);
    filterComplex += `;[1:v]format=rgba,scale=140:-1,colorchannelmixer=aa=0.9[logo];[vtxt][logo]overlay=W-w-48:48:format=auto[vout]`;
  } else {
    filterComplex += `;[vtxt]null[vout]`;
  }

  await runFfmpeg([
    ...inputs,
    '-filter_complex',
    filterComplex,
    '-map',
    '[vout]',
    '-q:v',
    '2',
    outputPath
  ]);
}

export async function generate3ReelCovers(project) {
  await fs.mkdir(storageDirs.covers, { recursive: true });
  await fs.mkdir(storageDirs.temp, { recursive: true });

  const headlines = await generateCoverHeadlines(project);
  const logo = await getLogoPath();
  const styles = ['viral_hook', 'insight_dark'];
  const styleLabels = ['Option 1 (Viral Hook Cover)', 'Option 2 (Core Insight Cover)'];
  const query = project.topic || project.title || 'motivation';

  const videoPath = project.media?.videoFilename ? path.join(storageDirs.videos, project.media.videoFilename) : null;
  const coverOptions = [];

  for (let index = 0; index < 2; index += 1) {
    const coverId = `cover-${Date.now()}-${index + 1}`;
    const frameFilename = `${coverId}-temp.png`;
    const framePath = path.join(storageDirs.temp, frameFilename);
    const coverFilename = `${coverId}.jpg`;
    const coverPath = path.join(storageDirs.covers, coverFilename);

    try {
      const pexelsDownloaded = await fetchPexelsStockPhoto({
        topic: project.topic,
        niche: project.niche,
        title: project.title,
        hook: project.hook,
        index,
        outputPath: framePath
      });

      if (!pexelsDownloaded && videoPath) {
        await extractVideoFrame({
          videoPath,
          timestamp: index === 0 ? 1.5 : 4.5,
          outputPath: framePath
        });
      }

      await compositeReelCover({
        framePath,
        headline: headlines[index] || project.title,
        style: styles[index],
        logo,
        outputPath: coverPath
      });

      coverOptions.push({
        id: coverId,
        filename: coverFilename,
        url: `/api/media/covers/${coverFilename}`,
        headline: headlines[index],
        style: styles[index],
        label: styleLabels[index]
      });
    } finally {
      await fs.unlink(framePath).catch(() => {});
    }
  }

  return coverOptions;
}
