import axios from 'axios';

function parseJsonFromText(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Ollama response did not contain JSON.');
  return JSON.parse(match[0]);
}

function cleanTopicLine(line) {
  return String(line || '')
    .replace(/^\s*[-*]\s*/, '')
    .replace(/^\s*\d+[\).:-]\s*/, '')
    .replace(/^["']|["']$/g, '')
    .trim();
}

function parseTopicIdeas(response) {
  try {
    const parsed = parseJsonFromText(response);
    if (Array.isArray(parsed.topics)) return parsed.topics.map(cleanTopicLine).filter(Boolean);
  } catch {
    // Fall back to line parsing when the local model ignores JSON instructions.
  }

  return response
    .split(/\r?\n/)
    .map(cleanTopicLine)
    .filter((line) => line && !/^topics?:?$/i.test(line))
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

export async function generateScriptWithOllama(input) {
  const baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'llama3.2:3b';
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

  const { data } = await axios.post(
    `${baseURL}/api/generate`,
    { model, prompt, stream: false, format: 'json' },
    { timeout: 120000 }
  );

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
  const baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'llama3.2:3b';
  const prompt = `
Give me 20 viral YouTube Shorts topics in ${niche}.
Make them curiosity-driven, emotional, highly clickable, short title only.
Target Indian + global audience.

Return only valid JSON with this exact shape:
{
  "topics": ["short title 1", "short title 2"]
}
`;

  const { data } = await axios.post(
    `${baseURL}/api/generate`,
    { model, prompt, stream: false, format: 'json' },
    { timeout: 120000 }
  );

  const response = typeof data.response === 'string' ? data.response : JSON.stringify(data.response || {});
  const topics = parseTopicIdeas(response);

  if (!topics.length) {
    throw new Error('Ollama did not return topic ideas. Try again with a different niche.');
  }

  return topics.slice(0, 20);
}

export async function generateYoutubeMetadataWithOllama(project) {
  const baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'llama3.2:3b';
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

  const { data } = await axios.post(
    `${baseURL}/api/generate`,
    { model, prompt, stream: false, format: 'json' },
    { timeout: 120000 }
  );

  const parsed = typeof data.response === 'string' ? parseJsonFromText(data.response) : data.response;
  const tags = Array.isArray(parsed.tags) ? parsed.tags.map(String).map((tag) => tag.replace(/^#/, '').trim()).filter(Boolean) : [];

  return {
    title: String(parsed.title || project.title || project.topic).trim().slice(0, 95),
    description: String(parsed.description || '').trim(),
    tags: tags.slice(0, 20)
  };
}
