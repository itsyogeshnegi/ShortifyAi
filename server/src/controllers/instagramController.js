import Project from '../models/Project.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generateInstagramCaptionWithOllama } from '../services/ollamaService.js';
import {
  assertInstagramReady,
  createInstagramAuthUrl,
  fetchInstagramContainerStatus,
  fetchInstagramMediaDetails,
  getInstagramConnectionStatus,
  handleInstagramCallback,
  uploadReelToInstagram
} from '../services/instagramService.js';

function getInstagramErrorMessage(error) {
  return error.response?.data?.error?.message || error.response?.data?.error_user_msg || error.message;
}

async function runInstagramUpload({ projectId, userId, videoUrl, caption }) {
  const project = await Project.findOne({ _id: projectId, user: userId });
  if (!project) return;

  try {
    const published = await uploadReelToInstagram({ videoUrl, caption });
    project.instagram = {
      ...project.instagram,
      status: 'published',
      containerId: published.containerId,
      mediaId: published.mediaId,
      permalink: published.permalink,
      publishedAt: new Date(),
      lastCheckedAt: new Date(),
      errorMessage: ''
    };
    await project.save();
  } catch (error) {
    project.instagram = {
      ...project.instagram,
      status: 'failed',
      errorMessage: getInstagramErrorMessage(error)
    };
    await project.save();
    console.error(`Instagram Reel upload failed for project ${projectId}: ${getInstagramErrorMessage(error)}`);
  }
}

export const getAuthUrl = asyncHandler(async (_req, res) => {
  res.json({ url: createInstagramAuthUrl() });
});

export const oauthCallback = asyncHandler(async (req, res) => {
  if (!req.query.code) {
    const error = new Error('Meta OAuth callback did not include an authorization code.');
    error.statusCode = 400;
    throw error;
  }

  await handleInstagramCallback(req.query.code);
  res.send(`
    <html>
      <body style="font-family: sans-serif; background: #000000; color: white; padding: 32px;">
        <h1 style="color: #6ef3c5;">Instagram connected successfully</h1>
        <p>You can close this tab and return to ShortifyAI.</p>
      </body>
    </html>
  `);
});

export const status = asyncHandler(async (_req, res) => {
  res.json(await getInstagramConnectionStatus());
});

export const generateCaption = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ _id: req.params.projectId, user: req.user._id }).populate('script');
  if (!project || project.status !== 'completed') {
    const error = new Error('Completed short not found.');
    error.statusCode = 404;
    throw error;
  }

  const generated = await generateInstagramCaptionWithOllama(project);
  project.instagram = {
    ...project.instagram,
    caption: generated.caption,
    errorMessage: ''
  };
  await project.save();

  res.json(generated);
});

export const upload = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ _id: req.params.projectId, user: req.user._id });
  if (!project || project.status !== 'completed' || !project.media?.videoFilename) {
    const error = new Error('Completed video file not found for upload.');
    error.statusCode = 404;
    throw error;
  }

  if (project.instagram?.status === 'published' || project.instagram?.mediaId) {
    const error = new Error(project.instagram?.permalink || 'This short is already published as an Instagram Reel.');
    error.statusCode = 409;
    throw error;
  }

  if (project.instagram?.status === 'uploading') {
    const error = new Error('Instagram Reel upload is already in progress.');
    error.statusCode = 409;
    throw error;
  }

  await assertInstagramReady();

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const videoPublicUrl = `${baseUrl}/api/media/videos/${project.media.videoFilename}`;
  const caption = String(req.body.caption || project.instagram?.caption || `${project.title}\n\n${project.hook}`).trim();

  project.instagram = {
    ...project.instagram,
    status: 'uploading',
    caption,
    uploadStartedAt: new Date(),
    errorMessage: ''
  };
  await project.save();

  setImmediate(() => {
    runInstagramUpload({
      projectId: project._id,
      userId: req.user._id,
      videoUrl: videoPublicUrl,
      caption
    });
  });

  res.status(202).json(project);
});

export const refreshInstagramStatus = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ _id: req.params.projectId, user: req.user._id });
  if (!project) {
    const error = new Error('Short project not found.');
    error.statusCode = 404;
    throw error;
  }

  const containerId = project.instagram?.containerId;
  const mediaId = project.instagram?.mediaId;

  if (mediaId) {
    const details = await fetchInstagramMediaDetails(mediaId);
    if (details?.permalink) {
      project.instagram.permalink = details.permalink;
      project.instagram.lastCheckedAt = new Date();
      await project.save();
    }
  } else if (containerId) {
    const container = await fetchInstagramContainerStatus(containerId);
    project.instagram.statusCode = container.status_code;
    project.instagram.lastCheckedAt = new Date();
    await project.save();
  }

  res.json(project);
});
