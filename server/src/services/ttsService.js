import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import slugify from 'slugify';
import { storageDirs } from '../utils/storage.js';

const execFileAsync = promisify(execFile);

function psEscape(value) {
  return String(value).replace(/'/g, "''");
}

export async function generateVoiceAudio(scriptText, title) {
  const basename = `${Date.now()}-${slugify(title || 'short-audio', { lower: true, strict: true })}.wav`;
  const outputPath = path.join(storageDirs.audio, basename);
  const escapedText = psEscape(scriptText.slice(0, 6000));
  const escapedPath = psEscape(outputPath);
  const command = `
Add-Type -AssemblyName System.Speech;
$speak = New-Object System.Speech.Synthesis.SpeechSynthesizer;
$speak.Rate = 1;
$speak.Volume = 100;
$speak.SetOutputToWaveFile('${escapedPath}');
$speak.Speak('${escapedText}');
$speak.Dispose();
`;

  await execFileAsync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], {
    windowsHide: true,
    timeout: 120000
  });

  return { filename: basename, path: outputPath };
}
