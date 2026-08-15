import fs from 'fs/promises';
import path from 'path';
import Project from '../models/Project.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { assertSafeFilename, storageDirs } from '../utils/storage.js';

export const previewVideo = asyncHandler(async (req, res) => {
  const { filename } = req.params;
  assertSafeFilename(filename);

  const project = await Project.findOne({ user: req.user._id, 'media.videoFilename': filename });
  if (!project) {
    const error = new Error('Video preview not found.');
    error.statusCode = 404;
    throw error;
  }

  const filePath = path.join(storageDirs.videos, filename);
  await fs.access(filePath);
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.sendFile(filePath);
});

export const previewThumbnail = asyncHandler(async (req, res) => {
  const { filename } = req.params;
  assertSafeFilename(filename);

  const project = await Project.findOne({ user: req.user._id, 'media.thumbFilename': filename });
  if (!project) {
    const error = new Error('Thumbnail preview not found.');
    error.statusCode = 404;
    throw error;
  }

  const filePath = path.join(storageDirs.thumbs, filename);
  await fs.access(filePath);
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.sendFile(filePath);
});

export const previewCover = asyncHandler(async (req, res) => {
  const { filename } = req.params;
  assertSafeFilename(filename);

  const filePath = path.join(storageDirs.covers, filename);
  await fs.access(filePath);
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.sendFile(filePath);
});
