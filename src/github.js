import fs from 'node:fs/promises';
import { MARKER } from './report.js';

export async function pullRequestNumber({ eventPath = process.env.GITHUB_EVENT_PATH, ref = process.env.GITHUB_REF } = {}) {
  if (eventPath) {
    try {
      const event = JSON.parse(await fs.readFile(eventPath, 'utf8'));
      const number = event.pull_request?.number || event.number;
      if (number) return Number(number);
    } catch {
      // Fall through to ref parsing.
    }
  }
  const match = String(ref || '').match(/^refs\/pull\/(\d+)\//);
  return match ? Number(match[1]) : null;
}

export async function upsertPullRequestComment({
  token,
  repository,
  number,
  body,
  apiBase = process.env.GITHUB_API_URL || 'https://api.github.com',
  fetchImpl = fetch,
}) {
  if (!token || !repository || !number) return { posted: false, reason: 'missing-github-context' };
  const headers = {
    accept: 'application/vnd.github+json',
    authorization: `Bearer ${token}`,
    'x-github-api-version': '2022-11-28',
    'user-agent': 'foxygeo-audit',
  };
  const listUrl = `${apiBase}/repos/${repository}/issues/${number}/comments?per_page=100`;
  const listed = await fetchImpl(listUrl, { headers });
  if (!listed.ok) return { posted: false, reason: `list-failed:${listed.status}` };
  const comments = await listed.json();
  const existing = Array.isArray(comments) ? comments.find((comment) => String(comment.body || '').includes(MARKER)) : null;
  const target = existing
    ? `${apiBase}/repos/${repository}/issues/comments/${existing.id}`
    : `${apiBase}/repos/${repository}/issues/${number}/comments`;
  const method = existing ? 'PATCH' : 'POST';
  const written = await fetchImpl(target, {
    method,
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ body }),
  });
  return { posted: written.ok, reason: written.ok ? (existing ? 'updated' : 'created') : `write-failed:${written.status}` };
}
