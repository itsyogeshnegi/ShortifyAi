import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { storageDirs } from '../utils/storage.js';

const INSTAGRAM_SCOPES = [
  'instagram_basic',
  'instagram_content_publish',
  'pages_show_list',
  'pages_read_engagement'
];
const tokenPath = path.join(storageDirs.tokens, 'instagram-token.json');

function getInstagramOAuthConfig() {
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || 'http://localhost:5000/api/instagram/callback';

  if (!appId || !appSecret) {
    const error = new Error('Meta Instagram App credentials missing. Add INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET to server/.env.');
    error.statusCode = 400;
    throw error;
  }

  return { appId, appSecret, redirectUri };
}

async function readToken() {
  try {
    return JSON.parse(await fs.readFile(tokenPath, 'utf8'));
  } catch {
    return null;
  }
}

async function writeToken(token) {
  await fs.mkdir(storageDirs.tokens, { recursive: true });
  await fs.writeFile(tokenPath, JSON.stringify(token, null, 2));
}

export async function getInstagramConnectionStatus() {
  const token = await readToken();
  return {
    connected: Boolean(token?.access_token && token?.igUserId),
    username: token?.username || token?.igUserId || undefined,
    hasAppConfig: Boolean(process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_SECRET)
  };
}

export async function assertInstagramReady() {
  getInstagramOAuthConfig();
  const token = await readToken();
  if (!token?.access_token || !token?.igUserId) {
    const error = new Error('Instagram is not connected. Connect your Meta Instagram account first.');
    error.statusCode = 400;
    throw error;
  }
}

export function createInstagramAuthUrl() {
  const { appId, redirectUri } = getInstagramOAuthConfig();
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: INSTAGRAM_SCOPES.join(','),
    response_type: 'code'
  });

  return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
}

export async function handleInstagramCallback(code) {
  const { appId, appSecret, redirectUri } = getInstagramOAuthConfig();

  // 1. Exchange authorization code for Short-Lived User Access Token
  const tokenRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
    params: {
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code
    },
    timeout: 30000
  });

  const shortToken = tokenRes.data.access_token;

  // 2. Exchange for Long-Lived Access Token (valid ~60 days)
  const longTokenRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
    params: {
      grant_type: 'fb_exchange_token',
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: shortToken
    },
    timeout: 30000
  });

  const accessToken = longTokenRes.data.access_token;

  // 3. Find connected Facebook Page & linked Instagram Business Account
  const accountsRes = await axios.get('https://graph.facebook.com/v19.0/me/accounts', {
    params: {
      fields: 'id,name,instagram_business_account{id,username}',
      access_token: accessToken
    },
    timeout: 30000
  });

  const page = (accountsRes.data.data || []).find((p) => p.instagram_business_account?.id);
  const igAccount = page?.instagram_business_account;

  if (!igAccount?.id) {
    const error = new Error('No Instagram Professional/Business account found linked to your Facebook Page.');
    error.statusCode = 400;
    throw error;
  }

  await writeToken({
    access_token: accessToken,
    pageId: page.id,
    igUserId: igAccount.id,
    username: igAccount.username,
    savedAt: new Date().toISOString()
  });
}

export async function fetchInstagramContainerStatus(containerId) {
  const token = await readToken();
  if (!token?.access_token) {
    const error = new Error('Instagram is not connected.');
    error.statusCode = 400;
    throw error;
  }

  const { data } = await axios.get(`https://graph.facebook.com/v19.0/${containerId}`, {
    params: {
      fields: 'status_code,status,id',
      access_token: token.access_token
    },
    timeout: 30000
  });

  return data;
}

export async function fetchInstagramMediaDetails(mediaId) {
  const token = await readToken();
  if (!token?.access_token) return null;

  const { data } = await axios.get(`https://graph.facebook.com/v19.0/${mediaId}`, {
    params: {
      fields: 'id,permalink,media_type,media_product_type,timestamp',
      access_token: token.access_token
    },
    timeout: 30000
  });

  return data;
}

export async function uploadReelToInstagram({ videoUrl, caption }) {
  const token = await readToken();
  if (!token?.access_token || !token?.igUserId) {
    const error = new Error('Instagram account is not connected.');
    error.statusCode = 400;
    throw error;
  }

  const igUserId = token.igUserId;

  // Step 1: Create IG Reel Media Container
  const containerRes = await axios.post(`https://graph.facebook.com/v19.0/${igUserId}/media`, null, {
    params: {
      media_type: 'REELS',
      video_url: videoUrl,
      caption: caption || '',
      access_token: token.access_token
    },
    timeout: 45000
  });

  const containerId = containerRes.data.id;
  if (!containerId) throw new Error('Instagram did not return a media container ID.');

  // Step 2: Poll container status until FINISHED (up to 3 minutes)
  let containerFinished = false;
  for (let attempt = 0; attempt < 18; attempt += 1) {
    await new Promise((r) => setTimeout(r, 10000));
    const status = await fetchInstagramContainerStatus(containerId);
    if (status.status_code === 'FINISHED') {
      containerFinished = true;
      break;
    }
    if (status.status_code === 'ERROR') {
      throw new Error(`Instagram video processing failed: ${status.status || 'ERROR'}`);
    }
  }

  if (!containerFinished) {
    throw new Error('Instagram video processing timed out. Container is still processing on Instagram servers.');
  }

  // Step 3: Publish Container
  const publishRes = await axios.post(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`, null, {
    params: {
      creation_id: containerId,
      access_token: token.access_token
    },
    timeout: 45000
  });

  const mediaId = publishRes.data.id;
  const mediaDetails = mediaId ? await fetchInstagramMediaDetails(mediaId).catch(() => null) : null;

  return {
    containerId,
    mediaId,
    permalink: mediaDetails?.permalink || (mediaId ? `https://www.instagram.com/p/${mediaId}/` : undefined)
  };
}
