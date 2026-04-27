import fs from 'fs/promises';
import path from 'path';
import Project from '../models/Project.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { storageDirs } from '../utils/storage.js';
import { generateYoutubeMetadataWithOllama } from '../services/ollamaService.js';
import {
  assertYoutubeReady,
  createYoutubeAuthUrl,
  fetchYoutubeVideoStatus,
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

function isFutureDate(date) {
  return date instanceof Date && !Number.isNaN(date.getTime()) && date.getTime() > Date.now();
}

function applyYoutubeRemoteStatus(project, remoteStatus) {
  if (!remoteStatus) return;

  const hasYoutubeFailure = ['deleted', 'failed', 'rejected'].includes(remoteStatus.uploadStatus)
    || remoteStatus.processingStatus === 'failed';
  const nextStatus = hasYoutubeFailure
    ? 'failed'
    : remoteStatus.scheduledPublishAt && remoteStatus.scheduledPublishAt.getTime() > Date.now()
      ? 'scheduled'
      : 'uploaded';

  project.youtube = {
    ...project.youtube,
    status: nextStatus,
    videoId: remoteStatus.videoId || project.youtube?.videoId,
    watchUrl: remoteStatus.watchUrl || project.youtube?.watchUrl,
    uploadStatus: remoteStatus.uploadStatus,
    processingStatus: remoteStatus.processingStatus,
    processingFailureReason: remoteStatus.processingFailureReason,
    processingWarnings: remoteStatus.processingWarnings || [],
    privacyStatus: remoteStatus.privacyStatus || project.youtube?.privacyStatus,
    scheduledPublishAt: remoteStatus.scheduledPublishAt || project.youtube?.scheduledPublishAt,
    youtubeAcceptedAt: project.youtube?.youtubeAcceptedAt || (remoteStatus.videoId ? new Date() : undefined),
    lastCheckedAt: remoteStatus.lastCheckedAt,
    lastProcessingCheckAt: remoteStatus.lastCheckedAt,
    errorMessage: hasYoutubeFailure
      ? `YouTube processing failed${remoteStatus.processingFailureReason ? `: ${remoteStatus.processingFailureReason}` : remoteStatus.uploadStatus ? `: ${remoteStatus.uploadStatus}` : '.'}`
      : ''
  };
}

async function refreshProjectYoutubeStatus({ projectId, userId }) {
  const project = await Project.findOne({ _id: projectId, user: userId });
  const videoId = project?.youtube?.videoId;
  if (!project || !videoId || ['failed'].includes(project.youtube?.status)) return null;

  const remoteStatus = await fetchYoutubeVideoStatus(videoId);
  applyYoutubeRemoteStatus(project, remoteStatus);
  await project.save();
  return project;
}

function scheduleYoutubeProcessingChecks({ projectId, userId }) {
  const delays = [30_000, 2 * 60_000, 5 * 60_000, 10 * 60_000, 20 * 60_000];

  for (const delay of delays) {
    setTimeout(async () => {
      try {
        const project = await refreshProjectYoutubeStatus({ projectId, userId });
        if (project?.youtube?.processingStatus === 'succeeded' || project?.youtube?.status === 'failed') {
          return;
        }
      } catch (error) {
        console.warn(`YouTube processing recheck skipped for project ${projectId}: ${getYoutubeErrorMessage(error)}`);
      }
    }, delay);
  }
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
      youtubeAcceptedAt: new Date(),
      errorMessage: ''
    };
    applyYoutubeRemoteStatus(project, uploaded.youtubeStatus);
    await project.save();
    scheduleYoutubeProcessingChecks({ projectId, userId });
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

  const requestedPublishAt = req.body.publishAt ? new Date(req.body.publishAt) : null;
  const publishAt = isFutureDate(requestedPublishAt) ? requestedPublishAt : null;
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
    uploadStartedAt: new Date(),
    youtubeAcceptedAt: undefined,
    lastProcessingCheckAt: undefined,
    uploadStatus: 'accepted_by_app',
    processingStatus: '',
    processingFailureReason: '',
    processingWarnings: [],
    lastCheckedAt: undefined,
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

export const refreshYoutubeStatus = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ _id: req.params.projectId, user: req.user._id });
  if (!project || project.status !== 'completed') {
    const error = new Error('Completed short not found.');
    error.statusCode = 404;
    throw error;
  }

  const requestedVideoId = String(req.body?.videoId || '').trim();
  const videoId = project.youtube?.videoId || requestedVideoId;
  if (!videoId) {
    const error = new Error('Paste the YouTube video ID or URL once so ShortifyAI can track this upload.');
    error.statusCode = 400;
    throw error;
  }

  const cleanVideoId = videoId.includes('youtube.com')
    ? new URL(videoId).searchParams.get('v')
    : videoId.includes('youtu.be/')
      ? videoId.split('youtu.be/')[1]?.split(/[?&]/)[0]
      : videoId;

  await assertYoutubeReady();
  const remoteStatus = await fetchYoutubeVideoStatus(cleanVideoId);
  applyYoutubeRemoteStatus(project, remoteStatus);
  await project.save();

  res.json(project);
});
