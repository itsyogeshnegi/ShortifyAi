export const themeTemplates = [
  {
    id: 'money-success',
    label: 'Money / Success',
    niches: ['Money / Success'],
    hints: ['wealth lifestyle', 'success mindset', 'luxury business', 'growth charts']
  },
  {
    id: 'ai-tech',
    label: 'AI / Tech',
    niches: ['AI / Tech'],
    hints: ['artificial intelligence', 'futuristic coding', 'technology interface', 'digital innovation']
  },
  {
    id: 'motivation',
    label: 'Motivation',
    niches: ['Motivation'],
    hints: ['sunrise motivation', 'daily discipline', 'self improvement', 'focused routine']
  },
  {
    id: 'facts-knowledge',
    label: 'Facts / Knowledge',
    niches: ['Facts / Knowledge'],
    hints: ['library knowledge', 'science visuals', 'history details', 'curious learning']
  },
  {
    id: 'fitness-bodybuilding',
    label: 'Fitness / Bodybuilding',
    niches: ['Fitness / Bodybuilding'],
    hints: ['gym workout', 'athlete training', 'healthy lifestyle', 'strength movement']
  },
  {
    id: 'crypto-finance',
    label: 'Crypto / Finance',
    niches: ['Crypto / Finance'],
    hints: ['crypto charts', 'trading desk', 'market analysis', 'bitcoin finance']
  },
  {
    id: 'relationships-psychology',
    label: 'Relationships / Psychology',
    niches: ['Relationships / Psychology'],
    hints: ['human emotions', 'relationship moments', 'psychology portrait', 'social behavior']
  }
];

export function getDefaultThemeTemplateId(niche) {
  return themeTemplates.find((template) => template.niches.includes(niche))?.id || themeTemplates[0].id;
}

export function getThemeTemplateById(id) {
  return themeTemplates.find((template) => template.id === id) || themeTemplates[0];
}
