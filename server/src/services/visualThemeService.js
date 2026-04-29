import { resolveThemeTemplate } from './themeTemplateService.js';

function includesAny(value, terms) {
  const text = String(value || '').toLowerCase();
  return terms.some((term) => text.includes(term));
}

function escapeDrawtext(value) {
  return String(value || '')
    .replace(/\\/g, ' ')
    .replace(/:/g, ' ')
    .replace(/'/g, ' ')
    .replace(/%/g, ' percent ')
    .slice(0, 42);
}

function paletteFor(input) {
  const { topic, niche, tone } = input;
  const template = resolveThemeTemplate(input.themeTemplate, niche);

  if (input.themeTemplate) {
    return {
      base: template.palette.base,
      accent: template.palette.accent,
      accent2: template.palette.accent2,
      glow: template.palette.glow,
      keywords: template.keywords
    };
  }

  const luxury = includesAny(tone, ['luxury', 'premium', 'rich', 'cinematic']);
  const finance = includesAny(`${topic} ${niche}`, ['money', 'finance', 'wealth', 'invest', 'cash', 'business']);
  const fitness = includesAny(`${topic} ${niche}`, ['fitness', 'gym', 'health', 'workout']);
  const tech = includesAny(`${topic} ${niche}`, ['ai', 'tech', 'software', 'coding', 'automation']);

  if (finance || luxury) {
    return {
      base: '#04130f',
      accent: '#d8b45a',
      accent2: '#27f5a7',
      glow: '#0f3b2f',
      keywords: ['WEALTH', 'MONEY', 'SMART MOVES', 'GROWTH']
    };
  }

  if (fitness) {
    return {
      base: '#120809',
      accent: '#ff6b35',
      accent2: '#ffe66d',
      glow: '#3a1115',
      keywords: ['ENERGY', 'DISCIPLINE', 'POWER', 'DAILY WINS']
    };
  }

  if (tech) {
    return {
      base: '#061225',
      accent: '#5be7ff',
      accent2: '#8dffb5',
      glow: '#102b4e',
      keywords: ['AI', 'SYSTEMS', 'AUTOMATE', 'BUILD']
    };
  }

  return {
    base: template.palette.base,
    accent: template.palette.accent,
    accent2: template.palette.accent2,
    glow: template.palette.glow,
    keywords: template.keywords
  };
}

function financeMotif(theme) {
  return [
    `drawgrid=w=90:h=90:t=1:c=${theme.accent}@0.10`,
    `drawbox=x='120+mod(t*70\\,760)':y='1250-180*sin(t*1.7)':w=150:h=5:c=${theme.accent}:t=fill`,
    `drawbox=x='270+mod(t*70\\,760)':y='1120-150*sin(t*1.4)':w=150:h=5:c=${theme.accent2}:t=fill`,
    `drawbox=x='420+mod(t*70\\,760)':y='990-130*sin(t*1.2)':w=150:h=5:c=${theme.accent}:t=fill`,
    `drawtext=text='$':fontcolor=${theme.accent}@0.20:fontsize=120:x='80+mod(t*35\\,900)':y='250+70*sin(t)'`
  ];
}

export function createVisualTheme(input = {}) {
  const theme = paletteFor(input);
  const topic = escapeDrawtext(input.topic || 'ShortifyAI');
  const niche = escapeDrawtext(input.niche || 'Creator');
  const isFinance = includesAny(`${input.topic} ${input.niche}`, ['money', 'finance', 'wealth', 'invest', 'cash', 'business']);
  const motif = isFinance ? financeMotif(theme) : [`drawgrid=w=120:h=120:t=1:c=${theme.accent}@0.08`];

  const filters = [
    `format=rgba`,
    `drawbox=x=0:y=0:w=1080:h=1920:c=${theme.base}:t=fill`,
    `drawbox=x='-220+80*sin(t*0.8)':y='220+120*cos(t*0.5)':w=720:h=720:c=${theme.glow}@0.35:t=fill`,
    `drawbox=x='520+90*cos(t*0.7)':y='1040+100*sin(t*0.9)':w=620:h=620:c=${theme.accent}@0.13:t=fill`,
    ...motif,
    `drawtext=text='${topic}':fontcolor=${theme.accent}:fontsize=78:borderw=4:bordercolor=black@0.45:x=(w-text_w)/2:y=170+18*sin(t*1.2)`,
    `drawtext=text='${niche}':fontcolor=white@0.80:fontsize=38:x=(w-text_w)/2:y=270`,
    `drawtext=text='${theme.keywords[0]}':fontcolor=white@0.16:fontsize=70:x='80+20*sin(t)':y=720`,
    `drawtext=text='${theme.keywords[1]}':fontcolor=${theme.accent2}@0.18:fontsize=62:x='620+25*cos(t*1.1)':y=980`,
    `drawtext=text='${theme.keywords[2]}':fontcolor=${theme.accent}@0.16:fontsize=54:x='140+30*cos(t*0.9)':y=1360`,
    `vignette=angle=PI/4`,
    `format=yuv420p`
  ];

  return {
    source: `color=c=${theme.base}:s=1080x1920:r=30:d=${input.duration || 30}`,
    filters: filters.join(',')
  };
}
