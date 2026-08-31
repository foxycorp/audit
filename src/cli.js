import path from 'node:path';
import { isPreviewHost } from './ai-access.js';
import { discoverLocal } from './discover.js';
import { exitCode, findingsFromLive, findingsFromLocal } from './findings.js';
import { githubAnnotations, jsonReport, markdownReport, textReport } from './report.js';
import { pullRequestNumber, upsertPullRequestComment } from './github.js';
import { liveSnapshot } from './live.js';
import { publishAudit } from './publish.js';

const HELP = `FoxyGEO AI Readiness linter

Usage:
  npx @foxygeo/audit
  npx @foxygeo/audit .
  npx @foxygeo/audit example.com
  npx @foxygeo/audit --ci --publish example.com

Options:
  --publish <domain>  Create/update the public report on foxygeo.com
  --no-publish        Skip publishing even when a domain is given
  --ci                GitHub annotations + sticky PR comment
  --format <name>     text | json | github   (default: text, github in --ci)
  --fail-on <level>   error | warning | never
  --root <dir>        Repo root for local file discovery
  -h, --help          Show this help
`;

export function parseArgs(argv) {
  const args = {
    target: null,
    publish: process.env.FOXYGEO_DOMAIN || '',
    ci: false,
    format: '',
    failOn: process.env.FOXYGEO_FAIL_ON || 'error',
    noPublish: process.env.FOXYGEO_PUBLISH === 'false',
    root: process.cwd(),
    help: false,
  };
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--ci') args.ci = true;
    else if (token === '--no-publish') args.noPublish = true;
    else if (token === '--publish') args.publish = argv[++i] || '';
    else if (token === '--format') args.format = argv[++i] || '';
    else if (token === '--fail-on') args.failOn = argv[++i] || 'error';
    else if (token === '--root') args.root = argv[++i] || args.root;
    else if (token === '--help' || token === '-h') args.help = true;
    else if (token.startsWith('-')) throw new Error(`Unknown option ${token}`);
    else positional.push(token);
  }
  args.target = positional[0] || null;
  if (!args.format) args.format = args.ci ? 'github' : 'text';
  if (process.env.GITHUB_ACTIONS === 'true') args.ci = true;
  return args;
}

export function looksLikeDomain(value) {
  if (!value || value === '.' || value === './') return false;
  if (value.includes('/') || value.includes('\\')) return false;
  return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(value);
}

export async function run(argv, { stdout = process.stdout, stderr = process.stderr, env = process.env, fetchImpl = fetch } = {}) {
  const args = parseArgs(argv);
  if (args.help) {
    stdout.write(`${HELP}\n`);
    return 0;
  }

  const domainTarget = looksLikeDomain(args.target) ? args.target : (looksLikeDomain(args.publish) ? args.publish : '');
  let result;
  if (domainTarget) {
    result = findingsFromLive(await liveSnapshot(domainTarget));
  } else {
    const local = await discoverLocal(path.resolve(args.root, args.target && !looksLikeDomain(args.target) ? args.target : '.'));
    result = findingsFromLocal(local);
    if (!local.robots && !local.llms && local.htmlFiles.length === 0) {
      stderr.write('No robots.txt, llms.txt, or HTML files found. Pass a domain: npx @foxygeo/audit example.com\n');
    }
  }

  let publicUrl = null;
  const publishDomain = args.noPublish ? '' : (args.publish || domainTarget);
  if (publishDomain && looksLikeDomain(publishDomain) && !isPreviewHost(publishDomain)) {
    try {
      const published = await publishAudit(publishDomain, { fetchImpl });
      if (published.published) publicUrl = published.publicUrl;
      else if (published.reason !== 'preview-host') {
        stderr.write(`Publish skipped (${published.reason}). Local lint results still apply.\n`);
      }
    } catch (error) {
      stderr.write(`Publish failed: ${error instanceof Error ? error.message : error}. Local lint results still apply.\n`);
    }
  }

  if (args.format === 'json') {
    stdout.write(`${JSON.stringify(jsonReport(result, { publicUrl }), null, 2)}\n`);
  } else if (args.format === 'github') {
    stdout.write(`${markdownReport(result, { publicUrl })}\n`);
    for (const annotation of githubAnnotations(result)) stdout.write(`${annotation}\n`);
  } else {
    stdout.write(`${textReport(result, { publicUrl })}\n`);
  }

  if (args.ci && env.GITHUB_TOKEN && env.GITHUB_REPOSITORY) {
    const number = await pullRequestNumber({ eventPath: env.GITHUB_EVENT_PATH, ref: env.GITHUB_REF });
    if (number) {
      const body = markdownReport(result, { publicUrl });
      const posted = await upsertPullRequestComment({
        token: env.GITHUB_TOKEN,
        repository: env.GITHUB_REPOSITORY,
        number,
        body,
        apiBase: env.GITHUB_API_URL,
        fetchImpl,
      });
      if (!posted.posted) stderr.write(`PR comment skipped (${posted.reason}).\n`);
    }
  }

  return exitCode(result, args.failOn);
}
