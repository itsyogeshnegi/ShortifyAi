const themeTemplates = [
  {
    id: 'money-success',
    label: 'Money / Success',
    niches: ['Money / Success'],
    searchHints: ['wealth lifestyle', 'luxury business', 'growth chart', 'success mindset'],
    palette: {
      base: '#04130f',
      accent: '#d8b45a',
      accent2: '#27f5a7',
      glow: '#0f3b2f'
    },
    keywords: ['WEALTH', 'MONEY', 'SMART MOVES', 'GROWTH'],
    ambient: {
      frequencies: [110, 165, 220],
      pulse: 0.22
    }
  },
  {
    id: 'ai-tech',
    label: 'AI / Tech',
    niches: ['AI / Tech'],
    searchHints: ['futuristic technology', 'digital interface', 'artificial intelligence', 'coding screens'],
    palette: {
      base: '#061225',
      accent: '#5be7ff',
      accent2: '#8dffb5',
      glow: '#102b4e'
    },
    keywords: ['AI', 'SYSTEMS', 'AUTOMATE', 'BUILD'],
    ambient: {
      frequencies: [146, 220, 293],
      pulse: 0.16
    }
  },
  {
    id: 'motivation',
    label: 'Motivation',
    niches: ['Motivation'],
    searchHints: ['sunrise success', 'motivational journey', 'focused person', 'discipline routine'],
    palette: {
      base: '#0f0c16',
      accent: '#ff9a62',
      accent2: '#ffe07a',
      glow: '#40201a'
    },
    keywords: ['RISE', 'FOCUS', 'ENERGY', 'ACTION'],
    ambient: {
      frequencies: [130, 196, 261],
      pulse: 0.2
    }
  },
  {
    id: 'facts-knowledge',
    label: 'Facts / Knowledge',
    niches: ['Facts / Knowledge'],
    searchHints: ['science learning', 'curious facts', 'documentary visuals', 'books knowledge'],
    palette: {
      base: '#07111f',
      accent: '#6ef3c5',
      accent2: '#ff7a45',
      glow: '#12243a'
    },
    keywords: ['FACTS', 'DISCOVER', 'LEARN', 'INSIGHT'],
    ambient: {
      frequencies: [123, 184, 246],
      pulse: 0.14
    }
  },
  {
    id: 'fitness-bodybuilding',
    label: 'Fitness / Bodybuilding',
    niches: ['Fitness / Bodybuilding'],
    searchHints: ['gym workout', 'athlete training', 'fitness discipline', 'power movement'],
    palette: {
      base: '#120809',
      accent: '#ff6b35',
      accent2: '#ffe66d',
      glow: '#3a1115'
    },
    keywords: ['POWER', 'DISCIPLINE', 'STRENGTH', 'GRIT'],
    ambient: {
      frequencies: [98, 147, 196],
      pulse: 0.24
    }
  },
  {
    id: 'crypto-finance',
    label: 'Crypto / Finance',
    niches: ['Crypto / Finance'],
    searchHints: ['bitcoin market', 'crypto trader', 'digital finance', 'trading charts'],
    palette: {
      base: '#04111c',
      accent: '#4ae0ff',
      accent2: '#f5b75a',
      glow: '#133a4d'
    },
    keywords: ['CRYPTO', 'MARKET', 'MOMENTUM', 'SIGNAL'],
    ambient: {
      frequencies: [104, 156, 208],
      pulse: 0.18
    }
  },
  {
    id: 'relationships-psychology',
    label: 'Relationships / Psychology',
    niches: ['Relationships / Psychology'],
    searchHints: ['human emotions', 'close portrait', 'relationship tension', 'psychology behavior'],
    palette: {
      base: '#140b16',
      accent: '#ff9ccf',
      accent2: '#8cc7ff',
      glow: '#341a33'
    },
    keywords: ['TRUST', 'MINDSET', 'EMOTION', 'CONNECTION'],
    ambient: {
      frequencies: [117, 175, 234],
      pulse: 0.12
    }
  }
];

const nicheTemplateIds = new Map([
  ['Money / Success', 'money-success'],
  ['Business / Entrepreneurship', 'money-success'],
  ['Marketing / Social Media', 'money-success'],
  ['AI / Tech', 'ai-tech'],
  ['Gaming', 'ai-tech'],
  ['Science / Space', 'ai-tech'],
  ['Motivation', 'motivation'],
  ['Career / Productivity', 'motivation'],
  ['Travel / Adventure', 'motivation'],
  ['Facts / Knowledge', 'facts-knowledge'],
  ['Education / Study', 'facts-knowledge'],
  ['History / Mystery', 'facts-knowledge'],
  ['Fitness / Bodybuilding', 'fitness-bodybuilding'],
  ['Health / Wellness', 'fitness-bodybuilding'],
  ['Food / Nutrition', 'fitness-bodybuilding'],
  ['Sports', 'fitness-bodybuilding'],
  ['Crypto / Finance', 'crypto-finance'],
  ['Relationships / Psychology', 'relationships-psychology'],
  ['Parenting / Family', 'relationships-psychology'],
  ['Fashion / Beauty', 'relationships-psychology']
]);

function cleanSceneText(value) {
  return String(value || '')
    .replace(/[#*"`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitScriptScenes(fullScript) {
  return cleanSceneText(fullScript)
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function sceneCountForDuration(duration) {
  if (Number(duration) === 15) return 3;
  if (Number(duration) === 30) return 5;
  return 7;
}

function buildSceneBeatPool({ input, generated }) {
  const bodyScenes = splitScriptScenes(generated.fullScript);
  const beats = [
    cleanSceneText(generated.hook || input.topic),
    ...bodyScenes,
    cleanSceneText(generated.cta || input.topic)
  ].filter(Boolean);

  if (beats.length === 0) {
    return [cleanSceneText(input.topic)];
  }

  return beats;
}

export function getThemeTemplates() {
  return themeTemplates;
}

export function getThemeTemplateById(id) {
  return themeTemplates.find((template) => template.id === id) || themeTemplates[0];
}

export function getDefaultThemeTemplateId(niche) {
  return nicheTemplateIds.get(niche) || themeTemplates[0].id;
}

export function resolveThemeTemplate(themeTemplate, niche) {
  const templateId = themeTemplate || getDefaultThemeTemplateId(niche);
  return getThemeTemplateById(templateId);
}

function extractKeywordsFromText(text) {
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'but', 'by', 'for', 'with',
    'about', 'against', 'between', 'into', 'through', 'during', 'before',
    'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out',
    'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
    'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both',
    'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
    'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can',
    'will', 'just', 'should', 'now', 'stop', 'doing', 'like', 'this', 'that',
    'your', 'you', 'my', 'our', 'what', 'how', 'make', 'get', 'use'
  ]);

  const words = cleanSceneText(text)
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  return words.slice(0, 3).join(' ') || cleanSceneText(text).slice(0, 30);
}

export function buildSceneQueries({ input, generated }) {
  const template = resolveThemeTemplate(input.themeTemplate, input.niche);
  const sceneCount = sceneCountForDuration(input.duration);
  const titleKeywords = extractKeywordsFromText(input.title || input.topic || '');
  const beatPool = buildSceneBeatPool({ input, generated });

  return Array.from({ length: sceneCount }, (_, index) => {
    const beat = beatPool[index] || beatPool[index % beatPool.length] || input.topic;
    const beatKeywords = extractKeywordsFromText(beat);
    const hint = template.searchHints[index % template.searchHints.length];

    // Priority: Title keywords > Scene beat keywords > Niche search hint
    const query = [titleKeywords, beatKeywords, hint]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      segmentIndex: index,
      text: beat,
      query: query || input.niche || 'motivation'
    };
  });
}

export function getSceneCountForDuration(duration) {
  return sceneCountForDuration(duration);
}
