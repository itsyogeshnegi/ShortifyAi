import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const srcRoot = path.resolve(__dirname, '..');
export const uploadsRoot = path.join(srcRoot, 'uploads');
export const assetRoot = path.join(srcRoot, 'assets');

export const storageDirs = {
  videos: path.join(uploadsRoot, 'videos'),
  audio: path.join(uploadsRoot, 'audio'),
  thumbs: path.join(uploadsRoot, 'thumbs'),
  temp: path.join(uploadsRoot, 'temp'),
  tokens: path.join(uploadsRoot, 'tokens'),
  covers: path.join(uploadsRoot, 'covers'),
  downloadedBackgrounds: path.join(uploadsRoot, 'backgrounds'),
  backgrounds: path.join(assetRoot, 'backgrounds'),
  fonts: path.join(assetRoot, 'fonts')
};

export async function ensureStorage() {
  await Promise.all(Object.values(storageDirs).map((dir) => fs.mkdir(dir, { recursive: true })));
}

export function assertSafeFilename(filename) {
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    const error = new Error('Invalid filename');
    error.statusCode = 400;
    throw error;
  }
}

export async function safeUnlink(filePath) {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
