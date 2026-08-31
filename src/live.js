import { extractSchemaTypes } from './schema.js';
import { parseRobots } from './ai-access.js';

const TIMEOUT_MS = 8000;

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'FoxyGEO-Audit/0.1 (+https://foxygeo.com/tools/cli-audit)',
        accept: 'text/html,text/plain,*/*',
      },
    });
    const text = response.ok ? await response.text() : '';
    return { ok: response.ok, status: response.status, url: response.url, text: text.slice(0, 512_000) };
  } catch {
    return { ok: false, status: 0, url, text: '' };
  } finally {
    clearTimeout(timer);
  }
}

async function firstOk(urls) {
  let last = { ok: false, status: 0, url: urls[0], text: '' };
  for (const url of urls) {
    last = await fetchText(url);
    if (last.ok) return last;
  }
  return last;
}

export async function liveSnapshot(domain) {
  const host = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
  const [robots, llms, home] = await Promise.all([
    firstOk([`https://${host}/robots.txt`, `http://${host}/robots.txt`]),
    firstOk([`https://${host}/llms.txt`, `http://${host}/llms.txt`]),
    firstOk([`https://${host}/`, `http://${host}/`]),
  ]);
  return {
    domain: host,
    robots: {
      exists: robots.ok,
      text: robots.ok ? robots.text : '',
      parsed: parseRobots(robots.ok ? robots.text : null),
    },
    llms: {
      exists: llms.ok,
      text: llms.ok ? llms.text : '',
    },
    homepage: {
      exists: home.ok,
      url: home.url,
      schemaTypes: home.ok ? extractSchemaTypes(home.text) : [],
    },
  };
}
