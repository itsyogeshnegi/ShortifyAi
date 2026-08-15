import { spawn } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';

const STDERR_TAIL_LIMIT = 20 * 1024;

export function getFfmpegPath() {
  if (process.env.FFMPEG_PATH && process.env.FFMPEG_PATH !== 'ffmpeg') {
    return process.env.FFMPEG_PATH;
  }

  return ffmpegStatic || 'ffmpeg';
}

function isMissingFfmpeg(error) {
  return error?.code === 'ENOENT' || /spawn .*ffmpeg.*ENOENT/i.test(error?.message || '');
}

function isBlockedFfmpeg(error) {
  return error?.code === 'EPERM' || /spawn .*ffmpeg.*EPERM/i.test(error?.message || '');
}

function appendTail(current, chunk) {
  const next = current + chunk.toString();
  return next.length > STDERR_TAIL_LIMIT ? next.slice(next.length - STDERR_TAIL_LIMIT) : next;
}

export async function runFfmpeg(args, options = {}) {
  try {
    const ffmpegArgs = ['-hide_banner', '-loglevel', 'error', '-nostats', ...args];

    return await new Promise((resolve, reject) => {
      let stderrTail = '';
      let stdoutTail = '';
      let settled = false;
      const child = spawn(getFfmpegPath(), ffmpegArgs, { windowsHide: true });
      const timeoutMs = options.timeout || 300000;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        child.kill('SIGKILL');
        const error = new Error(`FFmpeg timed out after ${timeoutMs}ms.${stderrTail ? `\n${stderrTail}` : ''}`);
        error.code = 'ETIMEDOUT';
        reject(error);
      }, timeoutMs);

      child.stdout?.on('data', (chunk) => {
        stdoutTail = appendTail(stdoutTail, chunk);
      });

      child.stderr?.on('data', (chunk) => {
        stderrTail = appendTail(stderrTail, chunk);
      });

      child.on('error', (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      });

      child.on('close', (code, signal) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);

        if (code === 0) {
          resolve({ stdout: stdoutTail, stderr: stderrTail });
          return;
        }

        const details = stderrTail || stdoutTail;
        const error = new Error(`FFmpeg failed${signal ? ` with signal ${signal}` : ` with exit code ${code}`}.${details ? `\n${details}` : ''}`);
        error.code = code;
        error.signal = signal;
        error.stderr = stderrTail;
        error.stdout = stdoutTail;
        reject(error);
      });
    });
  } catch (error) {
    if (isMissingFfmpeg(error)) {
      const friendly = new Error(
        'FFmpeg is not available to the backend. Run npm install --prefix server, then restart the backend. If you installed FFmpeg manually, set FFMPEG_PATH in server/.env to the full ffmpeg.exe path.'
      );
      friendly.statusCode = 503;
      throw friendly;
    }

    if (isBlockedFfmpeg(error)) {
      const friendly = new Error(
        `Windows blocked FFmpeg from running at ${getFfmpegPath()}. Right-click ffmpeg.exe, choose Properties, click Unblock if shown, or install FFmpeg with winget install Gyan.FFmpeg and set FFMPEG_PATH in server/.env. Restart the backend after fixing it.`
      );
      friendly.statusCode = 503;
      throw friendly;
    }

    throw error;
  }
}
