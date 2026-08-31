import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { aiReadiness, isPreviewHost, parseRobots } from '../src/ai-access.js';
import { extractSchemaTypes } from '../src/schema.js';
import { findingsFromLocal } from '../src/findings.js';
import { markdownReport } from '../src/report.js';

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

test('strong local site scores in the 90s', () => {
  const robots = parseRobots(readFileSync(path.join(fixtures, 'open-robots.txt'), 'utf8'));
  const llms = readFileSync(path.join(fixtures, 'llms.txt'), 'utf8');
  const types = extractSchemaTypes(readFileSync(path.join(fixtures, 'home.html'), 'utf8'));
  const result = aiReadiness({ robots, llmsExists: true, llmsText: llms, schemaTypes: types });
  assert.equal(result.score, 100);
  assert.equal(result.schema.hasBrand, true);
  assert.equal(result.schema.hasRich, true);
});

test('PR markdown includes the score and public link', () => {
  const result = findingsFromLocal({
    robots: { relative: 'robots.txt', text: readFileSync(path.join(fixtures, 'open-robots.txt'), 'utf8') },
    llms: { relative: 'llms.txt', text: readFileSync(path.join(fixtures, 'llms.txt'), 'utf8') },
    htmlFiles: [{ relative: 'index.html', text: readFileSync(path.join(fixtures, 'home.html'), 'utf8') }],
  });
  const markdown = markdownReport(result, { publicUrl: 'https://foxygeo.com/report/example-com' });
  assert.match(markdown, /FoxyGEO AI Readiness: 100\/100/);
  assert.match(markdown, /https:\/\/foxygeo.com\/report\/example-com/);
  assert.match(markdown, /<!-- foxygeo-audit -->/);
});

test('preview hosts are rejected for publish', () => {
  assert.equal(isPreviewHost('my-app.vercel.app'), true);
  assert.equal(isPreviewHost('example.com'), false);
});
