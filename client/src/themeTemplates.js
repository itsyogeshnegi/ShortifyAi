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

export const nicheOptions = [
  { label: 'Money / Success', templateId: 'money-success' },
  { label: 'Business / Entrepreneurship', templateId: 'money-success' },
  { label: 'Marketing / Social Media', templateId: 'money-success' },
  { label: 'AI / Tech', templateId: 'ai-tech' },
  { label: 'Gaming', templateId: 'ai-tech' },
  { label: 'Science / Space', templateId: 'ai-tech' },
  { label: 'Motivation', templateId: 'motivation' },
  { label: 'Career / Productivity', templateId: 'motivation' },
  { label: 'Travel / Adventure', templateId: 'motivation' },
  { label: 'Facts / Knowledge', templateId: 'facts-knowledge' },
  { label: 'Education / Study', templateId: 'facts-knowledge' },
  { label: 'History / Mystery', templateId: 'facts-knowledge' },
  { label: 'Fitness / Bodybuilding', templateId: 'fitness-bodybuilding' },
  { label: 'Health / Wellness', templateId: 'fitness-bodybuilding' },
  { label: 'Food / Nutrition', templateId: 'fitness-bodybuilding' },
  { label: 'Sports', templateId: 'fitness-bodybuilding' },
  { label: 'Crypto / Finance', templateId: 'crypto-finance' },
  { label: 'Relationships / Psychology', templateId: 'relationships-psychology' },
  { label: 'Parenting / Family', templateId: 'relationships-psychology' },
  { label: 'Fashion / Beauty', templateId: 'relationships-psychology' }
];

export function getDefaultThemeTemplateId(niche) {
  return nicheOptions.find((option) => option.label === niche)?.templateId || themeTemplates[0].id;
}

export function getThemeTemplateById(id) {
  return themeTemplates.find((template) => template.id === id) || themeTemplates[0];
}
