import assert from 'node:assert/strict';
import test from 'node:test';
import { upsertPullRequestComment } from '../src/github.js';
import { parseArgs } from '../src/cli.js';

test('updates an existing sticky PR comment', async () => {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, method: init.method || 'GET', body: init.body });
    if (String(url).includes('/issues/12/comments') && !init.method) {
      return {
        ok: true,
        json: async () => [{ id: 99, body: '<!-- foxygeo-audit -->\nold' }],
      };
    }
    return { ok: true, json: async () => ({}) };
  };
  const result = await upsertPullRequestComment({
    token: 't',
    repository: 'acme/site',
    number: 12,
    body: '<!-- foxygeo-audit -->\nnew',
    fetchImpl,
  });
  assert.equal(result.posted, true);
  assert.equal(result.reason, 'updated');
  assert.equal(calls[1].method, 'PATCH');
  assert.match(calls[1].url, /comments\/99$/);
});

test('parseArgs reads --ci and --publish', () => {
  const args = parseArgs(['--ci', '--publish', 'example.com', '--fail-on', 'warning']);
  assert.equal(args.ci, true);
  assert.equal(args.publish, 'example.com');
  assert.equal(args.failOn, 'warning');
  assert.equal(args.format, 'github');
});
