import { execFile } from 'child_process';
import { promisify } from 'util';
import ffmpegStatic from 'ffmpeg-static';

const execFileAsync = promisify(execFile);

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

export async function runFfmpeg(args, options = {}) {
  try {
    return await execFileAsync(getFfmpegPath(), args, {
      windowsHide: true,
      timeout: options.timeout || 180000
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
