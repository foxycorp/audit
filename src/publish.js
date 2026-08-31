import { isPreviewHost } from './ai-access.js';

const DEFAULT_API = 'https://foxygeo.com';

export async function publishAudit(domain, { apiBase = process.env.FOXYGEO_API_URL || DEFAULT_API, fetchImpl = fetch } = {}) {
  const host = String(domain || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '').toLowerCase();
  if (!host) throw new Error('A public domain is required to publish an audit');
  if (isPreviewHost(host)) {
    return { published: false, reason: 'preview-host', publicUrl: null };
  }
  const response = await fetchImpl(`${apiBase.replace(/\/$/, '')}/api/v1/cli/audits`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'user-agent': 'foxygeo-audit/0.1',
    },
    body: JSON.stringify({ domain: host, source: 'cli' }),
  });
  if (!response.ok) {
    const detail = await response.text();
    return { published: false, reason: `api:${response.status}`, detail: detail.slice(0, 300), publicUrl: null };
  }
  const payload = await response.json();
  return {
    published: true,
    reused: Boolean(payload.reused),
    publicUrl: payload.public_url,
    reportUrl: payload.report_url,
    aiReadiness: payload.ai_readiness,
    geoScore: payload.geo_score,
  };
}
