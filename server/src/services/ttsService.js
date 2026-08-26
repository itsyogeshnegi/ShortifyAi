import { execFile } from 'child_process';
import fs from 'fs/promises';
import { promisify } from 'util';
import path from 'path';
import crypto from 'crypto';
import slugify from 'slugify';
import { SarvamAIClient } from 'sarvamai';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { probeAudioDuration } from '../utils/ffmpeg.js';
import { storageDirs } from '../utils/storage.js';

const execFileAsync = promisify(execFile);

const languageVoices = {
  bengali: 'bn-IN-BashkarNeural',
  english: 'en-US-ChristopherNeural',
  hindi: 'hi-IN-MadhurNeural',
  gujarati: 'gu-IN-NiranjanNeural',
  kannada: 'kn-IN-GaganNeural',
  malayalam: 'ml-IN-MidhunNeural',
  marathi: 'mr-IN-ManoharNeural',
  tamil: 'ta-IN-ValluvarNeural',
  telugu: 'te-IN-MohanNeural'
};

const TICKS_PER_SECOND = 10000000;

function normalizeSpeechText(scriptText) {
  return String(scriptText || '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/[*_~#`>]/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[\u2013\u2014]/g, ', ')
    .replace(/&/g, ' and ')
    .replace(/%/g, ' percent ')
    .replace(/\$/g, ' dollars ')
    .replace(/₹/g, ' rupees ')
    .replace(/\+/g, ' plus ')
    .replace(/@/g, ' at ')
    .replace(/\bvs\.?\b/gi, 'versus')
    .replace(/\be\.?g\.?\b/gi, 'for example')
    .replace(/\bi\.?e\.?\b/gi, 'that is')
    .replace(/\b10x\b/gi, 'ten times')
    .replace(/\b100%\b/gi, 'one hundred percent')
    .replace(/\.{2,}/g, '.')
    .replace(/\s+([,.!?])/g, '$1')
    .replace(/([,.!?])(?=\S)/g, '$1 ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 6000);
}

function getNeuralVoice(language) {
  const configuredVoice = String(process.env.TTS_VOICE || '').trim();
  if (configuredVoice) return configuredVoice;

  return languageVoices[String(language || 'English').trim().toLowerCase()] || languageVoices.english;
}

function buildCaptionTimeline(metadataItems) {
  const words = metadataItems
    .filter((item) => item?.Type === 'WordBoundary' && item.Data?.text?.Text)
    .map((item) => ({
      text: String(item.Data.text.Text).trim(),
      start: Number(item.Data.Offset) / TICKS_PER_SECOND,
      end: (Number(item.Data.Offset) + Number(item.Data.Duration)) / TICKS_PER_SECOND
    }))
    .filter((word) => word.text && Number.isFinite(word.start) && Number.isFinite(word.end));

  const groups = [];
  let current = [];
  for (const word of words) {
    current.push(word);
    if (current.length >= 5 || /[.!?]$/.test(word.text)) {
      groups.push(current);
      current = [];
    }
  }
  if (current.length) groups.push(current);

  return groups.map((group, index) => {
    const nextStart = groups[index + 1]?.[0]?.start;
    const lastWordEnd = group[group.length - 1].end;
    return {
      text: group.map((word) => word.text).join(' '),
      start: group[0].start,
      end: nextStart === undefined
        ? lastWordEnd + 0.18
        : Math.max(group[0].start + 0.2, nextStart - 0.02)
    };
  });
}

async function collectStream(stream) {
  const chunks = [];
  if (!stream) return chunks;
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return chunks;
}

function collectMetadata(stream) {
  if (!stream) return Promise.resolve([]);

  return new Promise((resolve, reject) => {
    const items = [];
    stream.on('data', (chunk) => {
      try {
        const parsed = JSON.parse(chunk.toString());
        if (Array.isArray(parsed.Metadata)) items.push(...parsed.Metadata);
      } catch (error) {
        reject(error);
      }
    });
    stream.once('close', () => resolve(items));
    stream.once('error', reject);
  });
}

async function generateNeuralVoice(speechText, title, language) {
  const basename = `${Date.now()}-${slugify(title || 'short-audio', { lower: true, strict: true })}.mp3`;
  const outputPath = path.join(storageDirs.audio, basename);
  const voice = getNeuralVoice(language);
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, {
    wordBoundaryEnabled: true
  });

  let chunks = [];
  let metadataItems = [];
  try {
    const { audioStream, metadataStream } = tts.toStream(speechText, {
      rate: process.env.TTS_RATE || '+0%',
      pitch: process.env.TTS_PITCH || '-4Hz',
      volume: process.env.TTS_VOLUME || '+0%'
    });
    [chunks, metadataItems] = await Promise.all([
      collectStream(audioStream),
      collectMetadata(metadataStream)
    ]);
  } finally {
    tts.close();
  }

  const audio = Buffer.concat(chunks);

  if (!audio.length) throw new Error('Neural voice service returned empty audio.');
  await fs.writeFile(outputPath, audio);

  const timeline = buildCaptionTimeline(metadataItems);
  const duration = timeline.length ? timeline[timeline.length - 1].end : null;
  return { filename: basename, path: outputPath, timeline, duration, speechText };
}

async function generateSapiVoice(speechText, title) {
  const basename = `${Date.now()}-${slugify(title || 'short-audio', { lower: true, strict: true })}.wav`;
  const outputPath = path.join(storageDirs.audio, basename);
  const command = `
Add-Type -AssemblyName System.Speech;
$speak = New-Object System.Speech.Synthesis.SpeechSynthesizer;
$voice = $env:SHORTIFY_TTS_SAPI_VOICE;
if ($voice) {
  try { $speak.SelectVoice($voice) } catch {}
} else {
  $maleVoice = $speak.GetInstalledVoices() |
    Where-Object { $_.Enabled -and $_.VoiceInfo.Gender -eq [System.Speech.Synthesis.VoiceGender]::Male } |
    Select-Object -First 1;
  if ($maleVoice) { $speak.SelectVoice($maleVoice.VoiceInfo.Name) }
}
$speak.Rate = [int]$env:SHORTIFY_TTS_SAPI_RATE;
$speak.Volume = 100;
$speak.SetOutputToWaveFile($env:SHORTIFY_TTS_OUTPUT);
$speak.Speak($env:SHORTIFY_TTS_TEXT);
$speak.Dispose();
`;

  await execFileAsync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], {
    env: {
      ...process.env,
      SHORTIFY_TTS_OUTPUT: outputPath,
      SHORTIFY_TTS_TEXT: speechText,
      SHORTIFY_TTS_SAPI_RATE: process.env.TTS_SAPI_RATE || '0',
      SHORTIFY_TTS_SAPI_VOICE: process.env.TTS_SAPI_VOICE || ''
    },
    windowsHide: true,
    timeout: 120000
  });

  return { filename: basename, path: outputPath, timeline: [], duration: null, speechText };
}

async function generateSarvamVoice(speechText, title, language) {
  const apiKey = String(process.env.SARVAM_API_KEY || '').trim();
  if (!apiKey) throw new Error('SARVAM_API_KEY is not configured.');

  const model = process.env.SARVAM_MODEL || 'bulbul:v3';
  const cleanSpeechText = normalizeSpeechText(speechText);
  const containsDevanagari = /[\u0900-\u097F]/.test(cleanSpeechText);
  const langLower = String(language || '').toLowerCase();
  const isHindi = containsDevanagari || langLower.includes('hindi') || langLower.startsWith('hi');

  const langCode = isHindi ? 'hi-IN' : 'en-IN';
  const speaker = process.env.SARVAM_SPEAKER || (isHindi ? (process.env.SARVAM_SPEAKER_HI || 'sumit') : (process.env.SARVAM_SPEAKER_EN || 'sumit'));
  const pace = Number(process.env.SARVAM_PACE || 1.0);
  const speechSampleRate = Number(process.env.SARVAM_SAMPLE_RATE || 22050);

  const cacheDir = path.join(storageDirs.audio, 'sarvam_cache');
  await fs.mkdir(cacheDir, { recursive: true });

  const normalizedKey = cleanSpeechText.toLowerCase().replace(/[^\w\u0900-\u097F]/g, '');
  const hashKey = crypto.createHash('md5').update(`${normalizedKey}_${speaker}_${model}_${langCode}_${pace}_${speechSampleRate}`).digest('hex');
  const cacheFilePath = path.join(cacheDir, `${hashKey}.wav`);
  const basename = `${Date.now()}-${slugify(title || 'short-audio', { lower: true, strict: true })}.wav`;
  const outputPath = path.join(storageDirs.audio, basename);

  // Single-Hit Protection: If cached audio file exists on disk, reuse immediately without calling Sarvam API
  try {
    await fs.access(cacheFilePath);
    console.log(`[Sarvam AI] Reusing cached voice audio for text hash '${hashKey}' (0 API hits used).`);
    await fs.copyFile(cacheFilePath, outputPath);
    const cachedDuration = await probeAudioDuration(outputPath);
    return { filename: basename, path: outputPath, timeline: [], duration: cachedDuration, speechText: cleanSpeechText };
  } catch {
    // Cache miss - proceed to single API hit
  }

  console.log(`[Sarvam AI] Making single API hit to Sarvam AI TTS (${model}, speaker: ${speaker}, lang: ${langCode}, pace: ${pace}, sampleRate: ${speechSampleRate})...`);

  const client = new SarvamAIClient({
    apiSubscriptionKey: apiKey
  });

  const response = await client.textToSpeech.convert({
    text: cleanSpeechText,
    target_language_code: langCode,
    speaker,
    model,
    pace,
    speech_sample_rate: speechSampleRate
  });

  const base64Audio = response.audios?.[0];
  if (!base64Audio) {
    throw new Error('Sarvam AI text-to-speech API returned empty audio response.');
  }

  const audioBuffer = Buffer.from(base64Audio, 'base64');
  await fs.writeFile(cacheFilePath, audioBuffer);
  await fs.writeFile(outputPath, audioBuffer);

  const exactDuration = await probeAudioDuration(outputPath);
  console.log(`[Sarvam AI] Successfully synthesized human voice audio (${exactDuration || 'N/A'}s) and cached to '${hashKey}.wav'.`);
  return { filename: basename, path: outputPath, timeline: [], duration: exactDuration, speechText: cleanSpeechText };
}

export async function generateVoiceAudio(scriptText, title, language = 'English') {
  const speechText = normalizeSpeechText(scriptText);
  const provider = String(process.env.TTS_PROVIDER || 'sarvam').toLowerCase();
  const sarvamEnabled = process.env.SARVAM_ENABLED !== 'false';

  if (sarvamEnabled && (provider === 'sarvam' || !!process.env.SARVAM_API_KEY)) {
    try {
      return await generateSarvamVoice(speechText, title, language);
    } catch (error) {
      console.warn(`[Sarvam AI] TTS failed (${error.message}); falling back to MsEdgeTTS.`);
    }
  }

  if (provider === 'sapi') {
    return generateSapiVoice(speechText, title);
  }

  try {
    return await generateNeuralVoice(speechText, title, language);
  } catch (error) {
    if (process.env.TTS_FALLBACK_TO_SAPI === 'false') throw error;
    console.warn(`Neural voice unavailable; using Windows voice fallback: ${error.message}`);
    return generateSapiVoice(speechText, title);
  }
}
