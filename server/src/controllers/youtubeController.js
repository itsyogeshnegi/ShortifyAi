import fs from 'fs/promises';
import path from 'path';
import Project from '../models/Project.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { storageDirs } from '../utils/storage.js';
import { generateYoutubeMetadataWithOllama } from '../services/ollamaService.js';
import {
  assertYoutubeReady,
  createYoutubeAuthUrl,
  getYoutubeConnectionStatus,
  handleYoutubeCallback,
  uploadVideoToYoutube
} from '../services/youtubeService.js';

function getYoutubeErrorMessage(error) {
  return error.response?.data?.error?.message || error.response?.data?.error_description || error.message;
}

function normalizeYoutubeMetadata({ title, description, tags }) {
  const nextTags = Array.isArray(tags) ? tags.map(String) : [];
  const cleanTags = nextTags.map((tag) => tag.trim().replace(/^#/, '')).filter(Boolean);
  const hasShortsTag = cleanTags.some((tag) => tag.toLowerCase() === 'shorts');
  const nextDescription = String(description || '');
  const descriptionWithShorts = /#shorts\b/i.test(nextDescription)
    ? nextDescription
    : `${nextDescription.trim()}\n\n#Shorts`.trim();

  return {
    title: String(title || 'ShortifyAI Short').trim(),
    description: descriptionWithShorts,
    tags: hasShortsTag ? cleanTags : [...cleanTags, 'Shorts']
  };
}

async function runYoutubeUpload({ projectId, userId, videoPath, thumbnailPath, metadata }) {
  const project = await Project.findOne({ _id: projectId, user: userId });
  if (!project) return;

  try {
    const uploaded = await uploadVideoToYoutube({ videoPath, thumbnailPath, metadata });

    project.youtube = {
      ...project.youtube,
      status: uploaded.scheduledPublishAt ? 'scheduled' : 'uploaded',
      videoId: uploaded.videoId,
      watchUrl: uploaded.watchUrl,
      privacyStatus: uploaded.privacyStatus,
      scheduledPublishAt: uploaded.scheduledPublishAt || undefined,
      uploadedAt: new Date(),
      errorMessage: ''
    };
    await project.save();
  } catch (error) {
    project.youtube = {
      ...project.youtube,
      status: 'failed',
      errorMessage: getYoutubeErrorMessage(error)
    };
    await project.save();
    console.error(`YouTube upload failed for project ${projectId}: ${getYoutubeErrorMessage(error)}`);
  }
}

export const getAuthUrl = asyncHandler(async (_req, res) => {
  res.json({ url: createYoutubeAuthUrl() });
});

export const oauthCallback = asyncHandler(async (req, res) => {
  if (!req.query.code) {
    const error = new Error('Google OAuth callback did not include a code.');
    error.statusCode = 400;
    throw error;
  }

  await handleYoutubeCallback(req.query.code);
  res.send(`
    <html>
      <body style="font-family: sans-serif; background: #07111f; color: white; padding: 32px;">
        <h1>YouTube connected</h1>
        <p>You can close this tab and return to ShortifyAI.</p>
      </body>
    </html>
  `);
});

export const status = asyncHandler(async (_req, res) => {
  res.json(await getYoutubeConnectionStatus());
});

export const generateMetadata = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ _id: req.params.projectId, user: req.user._id }).populate('script');
  if (!project || project.status !== 'completed') {
    const error = new Error('Completed short not found.');
    error.statusCode = 404;
    throw error;
  }

  const generated = await generateYoutubeMetadataWithOllama(project);
  const metadata = normalizeYoutubeMetadata(generated);
  project.youtube = {
    ...project.youtube,
    title: metadata.title,
    description: metadata.description,
    tags: metadata.tags,
    status: project.youtube?.status || 'not_uploaded',
    errorMessage: ''
  };
  await project.save();

  res.json(metadata);
});

export const upload = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ _id: req.params.projectId, user: req.user._id });
  if (!project || project.status !== 'completed' || !project.media?.videoFilename) {
    const error = new Error('Completed video file not found for upload.');
    error.statusCode = 404;
    throw error;
  }

  if (project.youtube?.videoId || ['uploaded', 'scheduled'].includes(project.youtube?.status)) {
    const error = new Error(project.youtube?.watchUrl || 'This short is already uploaded to YouTube.');
    error.statusCode = 409;
    throw error;
  }

  if (project.youtube?.status === 'uploading') {
    const error = new Error('Upload already in progress. Please wait for YouTube processing to finish.');
    error.statusCode = 409;
    throw error;
  }

  const videoPath = path.join(storageDirs.videos, project.media.videoFilename);
  const thumbnailPath = project.media.thumbFilename ? path.join(storageDirs.thumbs, project.media.thumbFilename) : null;
  await fs.access(videoPath);
  await assertYoutubeReady();

  const publishAt = req.body.publishAt ? new Date(req.body.publishAt) : null;
  const tags = Array.isArray(req.body.tags)
    ? req.body.tags
    : String(req.body.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean);
  const metadata = normalizeYoutubeMetadata({
    title: req.body.title || project.youtube?.title || project.title,
    description: req.body.description || project.youtube?.description || '',
    tags
  });

  project.youtube = {
    ...project.youtube,
    status: 'uploading',
    title: metadata.title,
    description: metadata.description,
    tags: metadata.tags,
    privacyStatus: publishAt ? 'private' : req.body.privacyStatus || 'private',
    scheduledPublishAt: publishAt || undefined,
    errorMessage: ''
  };
  await project.save();

  setImmediate(() => {
    runYoutubeUpload({
      projectId: project._id,
      userId: req.user._id,
      videoPath,
      thumbnailPath,
      metadata: {
        title: project.youtube.title,
        description: project.youtube.description,
        tags: project.youtube.tags,
        privacyStatus: project.youtube.privacyStatus,
        publishAt
      }
    });
  });

  res.status(202).json(project);
});
