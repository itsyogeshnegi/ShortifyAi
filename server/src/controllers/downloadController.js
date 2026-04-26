import fs from 'fs/promises';
import path from 'path';
import Project from '../models/Project.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { assertSafeFilename, storageDirs } from '../utils/storage.js';

export const downloadVideo = asyncHandler(async (req, res) => {
  const { filename } = req.params;
  assertSafeFilename(filename);

  const project = await Project.findOne({ user: req.user._id, 'media.videoFilename': filename });
  if (!project) {
    const error = new Error('Video not found.');
    error.statusCode = 404;
    throw error;
  }

  const filePath = path.join(storageDirs.videos, filename);
  await fs.access(filePath);
  project.downloads += 1;
  await project.save();
  await User.updateOne({ _id: req.user._id }, { $inc: { downloads: 1 } });
  res.download(filePath, filename);
});
