export const AI_AGENTS = [
  'gptbot',
  'claudebot',
  'chatgpt-user',
  'oai-searchbot',
  'claude-user',
  'anthropic-ai',
  'perplexitybot',
  'google-extended',
  'ccbot',
  'applebot-extended',
];

export const PRIMARY_AGENTS = ['gptbot', 'claudebot'];
export const SECONDARY_AGENTS = ['perplexitybot', 'google-extended', 'ccbot', 'anthropic-ai'];

export const PREVIEW_SUFFIXES = [
  '.vercel.app',
  '.netlify.app',
  '.github.io',
  '.herokuapp.com',
  '.railway.app',
  '.onrender.com',
  '.fly.dev',
  '.web.app',
  '.firebaseapp.com',
  '.pages.dev',
  '.ngrok.io',
  '.ngrok-free.app',
  '.trycloudflare.com',
  '.amplifyapp.com',
  '.azurewebsites.net',
  '.cloudfront.net',
  '.workers.dev',
  '.localtest.me',
  '.nip.io',
  '.sslip.io',
];

const BRAND_SCHEMA_TYPES = new Set(['Organization', 'WebSite', 'LocalBusiness', 'Corporation', 'OnlineStore']);
const RICH_SCHEMA_TYPES = new Set(['FAQPage', 'Article', 'NewsArticle', 'BlogPosting', 'Product', 'SoftwareApplication', 'Service']);

export function isPreviewHost(host) {
  let name = String(host || '').trim().toLowerCase().replace(/\.$/, '');
  if (name.startsWith('www.')) name = name.slice(4);
  if (!name) return true;
  return PREVIEW_SUFFIXES.some((suffix) => name.endsWith(suffix));
}

function isRootRule(rule) {
  const value = String(rule || '').trim();
  return value === '/' || value === '/*';
}

export function parseRobots(text) {
  if (!text || !String(text).trim()) {
    return {
      present: false,
      blocksAi: false,
      blocksAll: false,
      agents: Object.fromEntries(AI_AGENTS.map((agent) => [agent, 'allow'])),
      sitemaps: [],
    };
  }

  const groups = [];
  let current = null;
  const sitemaps = [];

  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.split('#', 1)[0].trim();
    if (!line || !line.includes(':')) continue;
    const idx = line.indexOf(':');
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key === 'user-agent') {
      const agent = value.toLowerCase();
      if (!current || current.hasDirective) {
        current = { agents: new Set([agent]), allow: [], disallow: [], hasDirective: false };
        groups.push(current);
      } else {
        current.agents.add(agent);
      }
    } else if (key === 'allow' && current) {
      current.allow.push(value);
      current.hasDirective = true;
    } else if (key === 'disallow' && current) {
      current.disallow.push(value);
      current.hasDirective = true;
    } else if (key === 'sitemap' && value) {
      sitemaps.push(value);
    }
  }

  function groupFor(agent) {
    return groups.find((group) => group.agents.has(agent)) || groups.find((group) => group.agents.has('*')) || null;
  }

  function rootBlocked(group) {
    if (!group) return false;
    if (group.allow.some(isRootRule)) return false;
    return group.disallow.some((rule) => String(rule || '').trim() && isRootRule(rule));
  }

  const blocksAll = rootBlocked(groupFor('*'));
  const agents = {};
  for (const agent of AI_AGENTS) {
    agents[agent] = rootBlocked(groupFor(agent)) ? 'block' : 'allow';
  }
  const primaryBlocked = PRIMARY_AGENTS.some((agent) => agents[agent] === 'block');
  return {
    present: true,
    blocksAi: blocksAll || primaryBlocked,
    blocksAll,
    agents,
    sitemaps,
  };
}

export function scoreLlms(text, exists) {
  if (!exists) return { score: 0, ok: false, quality: 'missing' };
  const body = String(text || '').trim();
  if (body.length < 40) return { score: 10, ok: true, quality: 'thin' };
  const lowered = body.toLowerCase();
  const hasHeading = body.startsWith('#') || lowered.includes('llms');
  const urlCount = (lowered.match(/https?:\/\//g) || []).length;
  const hasOverview = body.includes('>') || body.includes('## ');
  if (hasHeading && hasOverview && urlCount >= 2) return { score: 30, ok: true, quality: 'strong' };
  if (hasHeading || urlCount >= 1) return { score: 20, ok: true, quality: 'basic' };
  return { score: 10, ok: true, quality: 'thin' };
}

export function scoreSchema(schemaTypes) {
  const types = new Set((schemaTypes || []).filter(Boolean));
  let score = 0;
  if (types.size) score += 10;
  if ([...types].some((item) => BRAND_SCHEMA_TYPES.has(item))) score += 12;
  if ([...types].some((item) => RICH_SCHEMA_TYPES.has(item))) score += 8;
  return {
    score,
    ok: types.size > 0,
    types: [...types].sort(),
    hasBrand: [...types].some((item) => BRAND_SCHEMA_TYPES.has(item)),
    hasRich: [...types].some((item) => RICH_SCHEMA_TYPES.has(item)),
  };
}

export function scoreRobots(parsed) {
  let score = 0;
  if (parsed.agents.gptbot === 'allow') score += 14;
  if (parsed.agents.claudebot === 'allow') score += 14;
  if (SECONDARY_AGENTS.every((agent) => parsed.agents[agent] === 'allow')) score += 8;
  if (parsed.present) score += 4;
  return {
    score,
    ok: !parsed.blocksAi,
    present: parsed.present,
    blocksAi: parsed.blocksAi,
    blocksAll: parsed.blocksAll,
    agents: parsed.agents,
  };
}

export function aiReadiness({ robots, llmsExists, llmsText, schemaTypes }) {
  const robotsPart = scoreRobots(robots);
  const llmsPart = scoreLlms(llmsText, llmsExists);
  const schemaPart = scoreSchema(schemaTypes);
  return {
    score: Math.min(100, robotsPart.score + llmsPart.score + schemaPart.score),
    robots: robotsPart,
    llms: llmsPart,
    schema: schemaPart,
  };
}
