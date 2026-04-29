import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import slugify from 'slugify';
import { storageDirs } from '../utils/storage.js';

const execFileAsync = promisify(execFile);

function normalizeSpeechText(scriptText) {
  return String(scriptText || '')
    .replace(/[–—]/g, '... ')
    .replace(/\s+/g, ' ')
    .replace(/([.!?])\s+/g, '$1 ... ')
    .trim()
    .slice(0, 6000);
}

export async function generateVoiceAudio(scriptText, title) {
  const basename = `${Date.now()}-${slugify(title || 'short-audio', { lower: true, strict: true })}.wav`;
  const outputPath = path.join(storageDirs.audio, basename);
  const speechText = normalizeSpeechText(scriptText);
  const command = `
Add-Type -AssemblyName System.Speech;
$speak = New-Object System.Speech.Synthesis.SpeechSynthesizer;
$speak.Rate = 0;
$speak.Volume = 100;
$speak.SetOutputToWaveFile($env:SHORTIFY_TTS_OUTPUT);
$speak.Speak($env:SHORTIFY_TTS_TEXT);
$speak.Dispose();
`;

  await execFileAsync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], {
    env: {
      ...process.env,
      SHORTIFY_TTS_OUTPUT: outputPath,
      SHORTIFY_TTS_TEXT: speechText
    },
    windowsHide: true,
    timeout: 120000
  });

  return { filename: basename, path: outputPath };
}
