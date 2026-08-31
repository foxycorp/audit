import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parseRobots } from '../src/ai-access.js';

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

test('open robots allow GPTBot and ClaudeBot', () => {
  const parsed = parseRobots(readFileSync(path.join(fixtures, 'open-robots.txt'), 'utf8'));
  assert.equal(parsed.agents.gptbot, 'allow');
  assert.equal(parsed.agents.claudebot, 'allow');
  assert.equal(parsed.blocksAi, false);
});

test('explicit GPTBot Disallow / is a block', () => {
  const parsed = parseRobots(readFileSync(path.join(fixtures, 'blocked-robots.txt'), 'utf8'));
  assert.equal(parsed.agents.gptbot, 'block');
  assert.equal(parsed.agents.claudebot, 'block');
  assert.equal(parsed.blocksAi, true);
});

test('Disallow /admin does not block the site', () => {
  const parsed = parseRobots(readFileSync(path.join(fixtures, 'admin-only-robots.txt'), 'utf8'));
  assert.equal(parsed.blocksAi, false);
  assert.equal(parsed.agents.gptbot, 'allow');
});

test('missing robots is open by default', () => {
  const parsed = parseRobots(null);
  assert.equal(parsed.present, false);
  assert.equal(parsed.blocksAi, false);
  assert.equal(parsed.agents.gptbot, 'allow');
});
