import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { storageDirs } from '../utils/storage.js';

const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly'
];
const tokenPath = path.join(storageDirs.tokens, 'youtube-token.json');

function tokenHasRequiredScopes(token) {
  const scopeText = String(token?.scope || '');
  return YOUTUBE_SCOPES.every((scope) => scopeText.includes(scope));
}

function getOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/youtube/callback';

  if (!clientId || !clientSecret) {
    const error = new Error('Google OAuth credentials are missing. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to server/.env.');
    error.statusCode = 400;
    throw error;
  }

  return { clientId, clientSecret, redirectUri };
}

async function readToken() {
  try {
    return JSON.parse(await fsp.readFile(tokenPath, 'utf8'));
  } catch {
    return null;
  }
}

async function writeToken(token) {
  await fsp.mkdir(storageDirs.tokens, { recursive: true });
  await fsp.writeFile(tokenPath, JSON.stringify(token, null, 2));
}

export async function getYoutubeConnectionStatus() {
  const token = await readToken();
  return {
    connected: Boolean(token?.refresh_token),
    hasRequiredScopes: tokenHasRequiredScopes(token),
    reconnectRequired: Boolean(token?.refresh_token) && !tokenHasRequiredScopes(token),
    hasClientConfig: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  };
}

export async function assertYoutubeReady() {
  getOAuthConfig();
  const token = await readToken();
  if (!token?.refresh_token) {
    const error = new Error('YouTube is not connected. Connect your Google account first.');
    error.statusCode = 400;
    throw error;
  }
}

export function createYoutubeAuthUrl() {
  const { clientId, redirectUri } = getOAuthConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: YOUTUBE_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent'
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function handleYoutubeCallback(code) {
  const { clientId, clientSecret, redirectUri } = getOAuthConfig();
  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code'
  });

  const { data } = await axios.post('https://oauth2.googleapis.com/token', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 30000
  });

  const existing = await readToken();
  await writeToken({
    ...existing,
    ...data,
    refresh_token: data.refresh_token || existing?.refresh_token,
    savedAt: new Date().toISOString()
  });
}

async function getAccessToken() {
  const token = await readToken();
  if (!token?.refresh_token) {
    const error = new Error('YouTube is not connected. Connect your Google account first.');
    error.statusCode = 400;
    throw error;
  }

  const { clientId, clientSecret } = getOAuthConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: token.refresh_token,
    grant_type: 'refresh_token'
  });

  const { data } = await axios.post('https://oauth2.googleapis.com/token', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 30000
  });

  await writeToken({ ...token, ...data, savedAt: new Date().toISOString() });
  return data.access_token;
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.map(String).map((tag) => tag.trim()).filter(Boolean).slice(0, 20);
  return String(tags || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function normalizeYoutubeStatus(video) {
  const processingDetails = video?.processingDetails || {};
  const suggestions = video?.suggestions || {};
  return {
    videoId: video?.id,
    watchUrl: video?.id ? `https://www.youtube.com/watch?v=${video.id}` : undefined,
    uploadStatus: video?.status?.uploadStatus,
    processingStatus: processingDetails.processingStatus,
    processingFailureReason: processingDetails.processingFailureReason,
    processingWarnings: [
      ...(suggestions.processingErrors || []),
      ...(suggestions.processingWarnings || []),
      ...(suggestions.processingHints || [])
    ].filter(Boolean),
    privacyStatus: video?.status?.privacyStatus,
    scheduledPublishAt: video?.status?.publishAt ? new Date(video.status.publishAt) : undefined,
    lastCheckedAt: new Date()
  };
}

export async function fetchYoutubeVideoStatus(videoId) {
  if (!videoId) {
    const error = new Error('YouTube video ID is required to check processing status.');
    error.statusCode = 400;
    throw error;
  }

  const accessToken = await getAccessToken();
  const { data } = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
    params: {
      part: 'status,processingDetails,suggestions,contentDetails,snippet',
      id: videoId
    },
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 30000
  });

  const video = data.items?.[0];
  if (!video) {
    const error = new Error('YouTube video was not found for this connected channel.');
    error.statusCode = 404;
    throw error;
  }

  return normalizeYoutubeStatus(video);
}

export async function uploadVideoToYoutube({ videoPath, thumbnailPath, metadata }) {
  const accessToken = await getAccessToken();
  const stat = await fsp.stat(videoPath);
  const requestedPublishAt = metadata.publishAt ? new Date(metadata.publishAt) : null;
  const publishAt = requestedPublishAt && requestedPublishAt.getTime() > Date.now() ? requestedPublishAt : null;
  const privacyStatus = publishAt ? 'private' : metadata.privacyStatus || process.env.YOUTUBE_DEFAULT_PRIVACY || 'private';
  const body = {
    snippet: {
      title: String(metadata.title || 'ShortifyAI Short').slice(0, 100),
      description: String(metadata.description || ''),
      tags: normalizeTags(metadata.tags),
      categoryId: process.env.YOUTUBE_DEFAULT_CATEGORY_ID || '22'
    },
    status: {
      privacyStatus,
      selfDeclaredMadeForKids: false,
      ...(publishAt ? { publishAt: publishAt.toISOString() } : {})
    }
  };

  const start = await axios.post(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    body,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Length': stat.size,
        'X-Upload-Content-Type': 'video/mp4'
      },
      timeout: 30000
    }
  );

  const uploadUrl = start.headers.location;
  if (!uploadUrl) throw new Error('YouTube did not return an upload URL.');

  const uploaded = await axios.put(uploadUrl, fs.createReadStream(videoPath), {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': stat.size
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 30 * 60 * 1000
  });

  const videoId = uploaded.data?.id;
  if (!videoId) throw new Error('YouTube upload completed but no video ID was returned.');

  if (thumbnailPath) {
    try {
      const thumbStat = await fsp.stat(thumbnailPath);
      await axios.post(
        `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(videoId)}&uploadType=media`,
        fs.createReadStream(thumbnailPath),
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'image/jpeg',
            'Content-Length': thumbStat.size
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          timeout: 120000
        }
      );
    } catch (error) {
      console.warn(`YouTube thumbnail upload skipped: ${error.message}`);
    }
  }

  return {
    videoId,
    watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    privacyStatus,
    scheduledPublishAt: publishAt,
    youtubeStatus: await fetchYoutubeVideoStatus(videoId).catch(() => null)
  };
}
