import path from 'path';
import Project from '../models/Project.js';
import Job from '../models/Job.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateShortInput } from '../utils/validation.js';
import { runGenerationPipeline } from '../services/generationService.js';
import { safeUnlink, storageDirs } from '../utils/storage.js';

export const createShort = asyncHandler(async (req, res) => {
  const input = validateShortInput(req.body);
  const scheduledFor = req.body.scheduledFor ? new Date(req.body.scheduledFor) : null;
  const isFuture = scheduledFor && scheduledFor.getTime() > Date.now() + 60000;

  const project = await Project.create({
    user: req.user._id,
    ...input,
    scheduledFor: isFuture ? scheduledFor : undefined,
    status: isFuture ? 'scheduled' : 'queued',
    progressStage: isFuture ? 'scheduled' : 'queued',
    progressPercent: 0,
    progressMessage: isFuture ? 'Short scheduled for later.' : 'Project queued.'
  });

  if (isFuture) {
    const job = await Job.create({ user: req.user._id, project: project._id, payload: input, scheduledFor });
    return res.status(202).json({ project, job, message: 'Short scheduled.' });
  }

  setImmediate(() => {
    runGenerationPipeline({ userId: req.user._id, projectId: project._id, input }).catch((error) => {
      console.error(`Generation failed for project ${project._id}: ${error.message}`);
    });
  });

  res.status(202).json({ project, message: 'Short generation started.' });
});

export const listShorts = asyncHandler(async (req, res) => {
  const filter = process.env.AUTH_DISABLED === 'true' ? {} : { user: req.user._id };
  const projects = await Project.find(filter).sort({ createdAt: -1 }).populate('script');
  res.json(projects);
});

export const getShort = asyncHandler(async (req, res) => {
  const project = process.env.AUTH_DISABLED === 'true'
    ? await Project.findById(req.params.id).populate('script')
    : await Project.findOne({ _id: req.params.id, user: req.user._id }).populate('script');

  if (!project) {
    const error = new Error('Short not found.');
    error.statusCode = 404;
    throw error;
  }
  res.json(project);
});

export const deleteShort = asyncHandler(async (req, res) => {
  const project = process.env.AUTH_DISABLED === 'true'
    ? await Project.findById(req.params.id)
    : await Project.findOne({ _id: req.params.id, user: req.user._id });
  if (!project) {
    const error = new Error('Short not found.');
    error.statusCode = 404;
    throw error;
  }

  const backgroundFiles = [
    project.media?.backgroundFilename,
    ...(project.media?.backgrounds || []).map((background) => background.filename)
  ].filter(Boolean);

  await Promise.all([
    safeUnlink(project.media?.videoFilename && path.join(storageDirs.videos, project.media.videoFilename)),
    safeUnlink(project.media?.audioFilename && path.join(storageDirs.audio, project.media.audioFilename)),
    safeUnlink(project.media?.thumbFilename && path.join(storageDirs.thumbs, project.media.thumbFilename)),
    safeUnlink(project.media?.subtitleFilename && path.join(storageDirs.temp, project.media.subtitleFilename)),
    ...backgroundFiles.map((filename) => safeUnlink(path.join(storageDirs.downloadedBackgrounds, filename)))
  ]);

  await project.deleteOne();
  await Job.deleteMany({ project: project._id });
  res.json({ message: 'Short deleted.' });
});
