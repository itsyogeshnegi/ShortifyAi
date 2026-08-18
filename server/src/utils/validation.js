import { getDefaultThemeTemplateId, getThemeTemplateById } from '../services/themeTemplateService.js';

const durations = [15, 30, 45, 60];

export function validateShortInput(body) {
  const topic = String(body.topic || '').trim();
  const niche = String(body.niche || '').trim();
  const tone = String(body.tone || '').trim();
  const language = String(body.language || '').trim();
  const duration = Number(body.duration);
  const requestedThemeTemplate = String(body.themeTemplate || '').trim();

  if (!topic || !niche || !tone || !language || !durations.includes(duration)) {
    const error = new Error('Topic, niche, tone, language, and duration (15/30/45/60) are required.');
    error.statusCode = 400;
    throw error;
  }

  const themeTemplate = requestedThemeTemplate
    ? getThemeTemplateById(requestedThemeTemplate).id
    : getDefaultThemeTemplateId(niche);

  return { topic, niche, tone, duration, language, themeTemplate };
}
