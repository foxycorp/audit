import { PRIMARY_AGENTS, SECONDARY_AGENTS, aiReadiness, parseRobots } from './ai-access.js';
import { extractSchemaTypes } from './schema.js';

export function findingsFromLocal({ robots, llms, htmlFiles }) {
  const robotsText = robots?.text || '';
  const parsed = parseRobots(robots ? robotsText : null);
  const schemaTypes = [...new Set((htmlFiles || []).flatMap((file) => extractSchemaTypes(file.text)))];
  const readiness = aiReadiness({
    robots: parsed,
    llmsExists: Boolean(llms),
    llmsText: llms?.text || '',
    schemaTypes,
  });
  return buildResult({
    mode: 'local',
    robotsPath: robots?.relative || null,
    llmsPath: llms?.relative || null,
    parsed,
    readiness,
    schemaTypes,
  });
}

export function findingsFromLive(snapshot) {
  const readiness = aiReadiness({
    robots: snapshot.robots.parsed,
    llmsExists: snapshot.llms.exists,
    llmsText: snapshot.llms.text,
    schemaTypes: snapshot.homepage.schemaTypes,
  });
  return buildResult({
    mode: 'live',
    robotsPath: snapshot.robots.exists ? '/robots.txt' : null,
    llmsPath: snapshot.llms.exists ? '/llms.txt' : null,
    parsed: snapshot.robots.parsed,
    readiness,
    schemaTypes: snapshot.homepage.schemaTypes,
    domain: snapshot.domain,
  });
}

function buildResult({ mode, robotsPath, llmsPath, parsed, readiness, schemaTypes, domain = null }) {
  const findings = [];
  if (parsed.agents.gptbot === 'block') {
    findings.push({ severity: 'error', id: 'gptbot-blocked', message: 'robots.txt blocks GPTBot at /' });
  }
  if (parsed.agents.claudebot === 'block') {
    findings.push({ severity: 'error', id: 'claudebot-blocked', message: 'robots.txt blocks ClaudeBot at /' });
  }
  if (parsed.blocksAll) {
    findings.push({ severity: 'error', id: 'robots-blocks-all', message: 'User-agent * disallows /' });
  }
  for (const agent of SECONDARY_AGENTS) {
    if (parsed.agents[agent] === 'block') {
      findings.push({ severity: 'warning', id: `${agent}-blocked`, message: `robots.txt blocks ${agent}` });
    }
  }
  if (!readiness.llms.ok) {
    findings.push({ severity: 'warning', id: 'llms-missing', message: 'llms.txt is missing' });
  } else if (readiness.llms.quality === 'thin') {
    findings.push({ severity: 'warning', id: 'llms-thin', message: 'llms.txt exists but is too thin to guide AI crawlers' });
  }
  if (!readiness.schema.ok) {
    findings.push({ severity: 'warning', id: 'schema-missing', message: 'No JSON-LD schema types found' });
  } else if (!readiness.schema.hasBrand) {
    findings.push({ severity: 'info', id: 'schema-brand', message: 'Add Organization or WebSite JSON-LD' });
  }
  if (!parsed.present) {
    findings.push({ severity: 'info', id: 'robots-missing', message: 'No robots.txt found; AI crawlers are allowed by default' });
  }

  const failed = findings.some((item) => item.severity === 'error');
  const warned = findings.some((item) => item.severity === 'warning');
  return {
    mode,
    domain,
    score: readiness.score,
    robotsPath,
    llmsPath,
    gptbot: parsed.agents.gptbot,
    claudebot: parsed.agents.claudebot,
    agents: parsed.agents,
    schemaTypes,
    readiness,
    findings,
    failed,
    warned,
    primaryOpen: PRIMARY_AGENTS.every((agent) => parsed.agents[agent] === 'allow'),
  };
}

export function exitCode(result, failOn = 'error') {
  if (failOn === 'never') return 0;
  if (result.failed) return 1;
  if (failOn === 'warning' && result.warned) return 1;
  return 0;
}
