import axios from 'axios';

function parseJsonFromText(text) {
  const clean = String(text || '')
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Ollama response did not contain JSON.');

  try {
    return JSON.parse(match[0]);
  } catch {
    const repaired = match[0].replace(/,\s*([}\]])/g, '$1');
    return JSON.parse(repaired);
  }
}

function cleanTopicLine(line) {
  return String(line || '')
    .replace(/^\s*[-*]\s*/, '')
    .replace(/^\s*\d+[\).:-]\s*/, '')
    .replace(/^["']|["']$/g, '')
    .replace(/```/g, '')
    .trim();
}

function parseTopicIdeas(response) {
  try {
    const parsed = parseJsonFromText(response);
    if (Array.isArray(parsed.topics) && parsed.topics.length > 0) {
      return parsed.topics.map(cleanTopicLine).filter(Boolean);
    }
  } catch {
    // Fall back to line parsing when model returns text or array list
  }

  return response
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .split(/\r?\n/)
    .map(cleanTopicLine)
    .filter((line) => line && !/^(topics?|json|\[|\]|\{|\}):?$/i.test(line))
    .slice(0, 20);
}

function normalizeVoiceScript({ hook, fullScript, cta, fallbackTopic }) {
  const source = [hook, fullScript, cta]
    .filter(Boolean)
    .join('. ')
    .replace(/[–—]/g, '...')
    .replace(/\s+/g, ' ')
    .trim();

  if (!source) {
    return `If you're thinking about ${fallbackTopic}, stay with me... this is simpler than it looks.`;
  }

  return source
    .replace(/:\s*/g, '... ')
    .replace(/;\s*/g, '... ')
    .replace(/,\s*/g, ', ')
    .replace(/\.\s+/g, '... ')
    .replace(/\?\s+/g, '? ... ')
    .replace(/!\s+/g, '! ... ')
    .trim();
}

function getOllamaBaseUrl() {
  return String(process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/+$/, '');
}

function getOllamaModel() {
  return process.env.OLLAMA_MODEL || 'gemma4:31b-cloud';
}

function getOllamaAuthMode() {
  return String(process.env.OLLAMA_AUTH_MODE || 'auto').toLowerCase();
}

function isCloudModel(model) {
  return /-cloud$/i.test(String(model || ''));
}

function isDirectCloudBaseUrl(baseURL) {
  return /^https:\/\/ollama\.com(?:\/|$)/i.test(baseURL);
}

function buildOllamaHeaders({ baseURL, model }) {
  const authMode = getOllamaAuthMode();
  const directCloud = isDirectCloudBaseUrl(baseURL);
  const apiKey = String(process.env.OLLAMA_API_KEY || '').trim();

  if (authMode === 'local') {
    return {};
  }

  if (authMode === 'cloud') {
    if (!apiKey) {
      const error = new Error('OLLAMA_AUTH_MODE is set to cloud, but OLLAMA_API_KEY is missing.');
      error.statusCode = 500;
      throw error;
    }
    return { Authorization: `Bearer ${apiKey}` };
  }

  if (directCloud) {
    if (!apiKey) {
      const error = new Error('OLLAMA_BASE_URL points to ollama.com, but OLLAMA_API_KEY is missing.');
      error.statusCode = 500;
      throw error;
    }
    return { Authorization: `Bearer ${apiKey}` };
  }

  if (isCloudModel(model)) {
    return {};
  }

  return {};
}

function extractUpstreamDetails(error) {
  const data = error?.response?.data;
  if (typeof data === 'string' && data.trim()) return data.trim();
  if (data?.error) return String(data.error).trim();
  if (data?.message) return String(data.message).trim();
  return '';
}

function buildCloud401Error({ baseURL, model, details }) {
  const directCloud = isDirectCloudBaseUrl(baseURL);
  const cloudModel = isCloudModel(model);

  if (!cloudModel) {
    const error = new Error(`Ollama request failed with status code 401.${details ? ` ${details}` : ''}`.trim());
    error.statusCode = 401;
    return error;
  }

  const fix = directCloud
    ? 'Set OLLAMA_API_KEY to a valid Ollama API key when using OLLAMA_BASE_URL=https://ollama.com.'
    : 'Run `ollama signin` on this machine, or switch to direct cloud mode with OLLAMA_BASE_URL=https://ollama.com and OLLAMA_API_KEY=your_key.';

  const error = new Error(`Ollama cloud authentication failed for model ${model}. ${fix}${details ? ` Upstream: ${details}` : ''}`);
  error.statusCode = 401;
  return error;
}

async function getAvailableLocalModel(baseURL) {
  try {
    const { data } = await axios.get(`${baseURL}/api/tags`, { timeout: 3000 });
    const models = (data?.models || []).map((m) => m.name).filter(Boolean);
    const local = models.find((m) => !isCloudModel(m));
    if (local) return local;
    return models[0] || null;
  } catch {
    return null;
  }
}

async function requestOllamaGenerate({ prompt, model, isRetry = false }) {
  const baseURL = getOllamaBaseUrl();
  const requestModel = model || getOllamaModel();
  const url = `${baseURL}/api/generate`;

  try {
    const { data } = await axios.post(
      url,
      { model: requestModel, prompt, stream: false, format: 'json' },
      {
        timeout: 120000,
        headers: buildOllamaHeaders({ baseURL, model: requestModel })
      }
    );

    return data;
  } catch (error) {
    const status = error?.response?.status;
    const details = extractUpstreamDetails(error);

    if (!isRetry && (isCloudModel(requestModel) || status === 404 || status === 401)) {
      const fallbackLocal = await getAvailableLocalModel(baseURL);
      if (fallbackLocal && fallbackLocal !== requestModel) {
        console.warn(`Ollama model '${requestModel}' unavailable (${status || error.message}). Automatically falling back to local model '${fallbackLocal}'...`);
        return await requestOllamaGenerate({ prompt, model: fallbackLocal, isRetry: true });
      }
    }

    if (status === 401) {
      throw buildCloud401Error({ baseURL, model: requestModel, details });
    }

    if (status) {
      const wrapped = new Error(`Ollama request failed with status code ${status}.${details ? ` ${details}` : ''}`.trim());
      wrapped.statusCode = status >= 400 && status < 600 ? status : 502;
      throw wrapped;
    }

    throw error;
  }
}

export async function generateScriptWithOllama(input) {
  const model = getOllamaModel();
  const prompt = `
You are ShortifyAI, a YouTube Shorts strategist.
Return only valid JSON with this exact shape:
{
  "title": "viral title",
  "hook": "first 2 seconds hook",
  "fullScript": "clean script for captions and record keeping",
  "voiceScript": "spoken script with natural pauses and emphasis punctuation",
  "cta": "short call to action",
  "hashtags": ["#tag1", "#tag2", "#tag3"]
}

Create a ${input.duration} second short in ${input.language}.
Topic: ${input.topic}
Niche: ${input.niche}
Tone: ${input.tone}
Write like you are giving practical advice to a smart peer.
Keep it conversational, slightly technical, accessible, and grounded.
Avoid guru language, luxury-mansion flexing, fake hype, and lecture tone.
Use contractions, shorter sentences, and varied rhythm.
The hook should sound natural, not salesy.
fullScript should stay clean and readable.
voiceScript should be optimized for TTS with micro-pauses using commas and ellipses for emphasis.
Make it punchy, retention-focused, and safe for general audiences.
`;

  const data = await requestOllamaGenerate({ prompt, model });
  const parsed = typeof data.response === 'string' ? parseJsonFromText(data.response) : data.response;

  return {
    title: String(parsed.title || input.topic).trim(),
    hook: String(parsed.hook || `Stop scrolling if you care about ${input.topic}.`).trim(),
    fullScript: String(parsed.fullScript || parsed.script || '').trim(),
    voiceScript: String(
      parsed.voiceScript || normalizeVoiceScript({
        hook: parsed.hook,
        fullScript: parsed.fullScript || parsed.script,
        cta: parsed.cta,
        fallbackTopic: input.topic
      })
    ).trim(),
    cta: String(parsed.cta || 'Follow for more practical ideas.').trim(),
    hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.map(String).slice(0, 8) : ['#shorts', '#ai']
  };
}

export async function generateTopicIdeasWithOllama(niche) {
  const model = getOllamaModel();
  const prompt = `
Give me 20 viral YouTube Shorts topics in ${niche}.
Make them curiosity-driven, emotional, highly clickable, short title only.
Target Indian + global audience.

Return only valid JSON with this exact shape:
{
  "topics": ["short title 1", "short title 2"]
}
`;

  const data = await requestOllamaGenerate({ prompt, model });
  const response = typeof data.response === 'string' ? data.response : JSON.stringify(data.response || {});
  const topics = parseTopicIdeas(response);

  if (!topics.length) {
    throw new Error('Ollama did not return topic ideas. Try again with a different niche.');
  }

  return topics.slice(0, 20);
}

export async function generateYoutubeMetadataWithOllama(project) {
  const model = getOllamaModel();
  const script = project.script || {};
  const prompt = `
You are a YouTube Shorts SEO strategist.
Return only valid JSON with this exact shape:
{
  "title": "ranking-friendly title under 95 characters",
  "description": "SEO description with a short hook, value summary, CTA, and hashtags",
  "tags": ["keyword 1", "keyword 2", "keyword 3"]
}

Create metadata for this YouTube Short.
Topic: ${project.topic}
Niche: ${project.niche}
Tone: ${project.tone}
Current title: ${project.title}
Hook: ${project.hook}
Script: ${script.fullScript || ''}
Hashtags: ${(project.hashtags || []).join(', ')}
Target Indian + global audience. Make it searchable, natural, and not spammy.
`;

  const data = await requestOllamaGenerate({ prompt, model });
  const parsed = typeof data.response === 'string' ? parseJsonFromText(data.response) : data.response;
  const tags = Array.isArray(parsed.tags) ? parsed.tags.map(String).map((tag) => tag.replace(/^#/, '').trim()).filter(Boolean) : [];

  return {
    title: String(parsed.title || project.title || project.topic).trim().slice(0, 95),
    description: String(parsed.description || '').trim(),
    tags: tags.slice(0, 20)
  };
}
