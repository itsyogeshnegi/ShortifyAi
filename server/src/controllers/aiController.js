import { asyncHandler } from '../utils/asyncHandler.js';
import { validateShortInput } from '../utils/validation.js';
import { generateScriptWithOllama, generateTopicIdeasWithOllama } from '../services/ollamaService.js';

export const generateScript = asyncHandler(async (req, res) => {
  const input = validateShortInput(req.body);
  const script = await generateScriptWithOllama(input);
  res.json(script);
});

export const generateTopicIdeas = asyncHandler(async (req, res) => {
  const niche = String(req.body.niche || '').trim();

  if (!niche) {
    const error = new Error('Niche is required.');
    error.statusCode = 400;
    throw error;
  }

  const topics = await generateTopicIdeasWithOllama(niche);
  res.json({ topics });
});
