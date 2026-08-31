import assert from 'node:assert/strict';
import test from 'node:test';
import { publishAudit } from '../src/publish.js';

test('does not publish preview hosts', async () => {
  const result = await publishAudit('pr-12.vercel.app', { fetchImpl: async () => { throw new Error('should not fetch'); } });
  assert.equal(result.published, false);
  assert.equal(result.reason, 'preview-host');
});

test('posts domain to the CLI audit API', async () => {
  const result = await publishAudit('example.com', {
    fetchImpl: async (url, init) => {
      assert.match(url, /\/api\/v1\/cli\/audits$/);
      assert.equal(JSON.parse(init.body).domain, 'example.com');
      return {
        ok: true,
        json: async () => ({
          public_url: 'https://foxygeo.com/report/example-com',
          report_url: '/report/example-com',
          ai_readiness: 94,
          geo_score: 80,
          reused: false,
        }),
      };
    },
  });
  assert.equal(result.published, true);
  assert.equal(result.publicUrl, 'https://foxygeo.com/report/example-com');
});
