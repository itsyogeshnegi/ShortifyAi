import fs from 'fs/promises';
import path from 'path';
import cron from 'node-cron';
import Project from '../models/Project.js';
import { storageDirs } from '../utils/storage.js';

let started = false;

async function removeOldFiles(dir, cutoff) {
  const removed = [];
  const files = await fs.readdir(dir);

  for (const file of files) {
    if (file === '.gitkeep') continue;
    const filePath = path.join(dir, file);
    const stat = await fs.stat(filePath);
    if (stat.mtime < cutoff) {
      await fs.unlink(filePath);
      removed.push(file);
    }
  }

  return removed;
}

export async function cleanupOldUploads() {
  const days = Number(process.env.UPLOAD_RETENTION_DAYS || 7);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const removed = [
    ...(await removeOldFiles(storageDirs.videos, cutoff)),
    ...(await removeOldFiles(storageDirs.audio, cutoff)),
    ...(await removeOldFiles(storageDirs.thumbs, cutoff)),
    ...(await removeOldFiles(storageDirs.temp, cutoff)),
    ...(await removeOldFiles(storageDirs.downloadedBackgrounds, cutoff))
  ];

  if (removed.length) {
    await Project.updateMany(
      {
        $or: [
          { 'media.videoFilename': { $in: removed } },
          { 'media.audioFilename': { $in: removed } },
          { 'media.thumbFilename': { $in: removed } },
          { 'media.subtitleFilename': { $in: removed } },
          { 'media.backgroundFilename': { $in: removed } }
        ]
      },
      { status: 'expired' }
    );
  }
}

export function startCleanupCron() {
  if (started) return;
  started = true;
  cron.schedule('0 3 * * *', cleanupOldUploads);
}
