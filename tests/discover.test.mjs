import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import test from 'node:test';
import { discoverLocal } from '../src/discover.js';
import { findingsFromLocal, exitCode } from '../src/findings.js';

test('discovers robots and llms in public/', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'foxygeo-audit-'));
  await mkdir(path.join(root, 'public'));
  await writeFile(path.join(root, 'public', 'robots.txt'), 'User-agent: GPTBot\nDisallow: /\n');
  await writeFile(path.join(root, 'public', 'index.html'), '<html><body>hi</body></html>');
  const local = await discoverLocal(root);
  assert.equal(local.robots.relative, 'public/robots.txt');
  const result = findingsFromLocal(local);
  assert.equal(result.failed, true);
  assert.equal(exitCode(result, 'error'), 1);
  assert.equal(result.gptbot, 'block');
});
