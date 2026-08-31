import fs from 'node:fs/promises';
import path from 'node:path';

const IGNORE_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.next',
  '.nuxt',
  '.output',
  'vendor',
  '.turbo',
  '.cache',
  'out',
]);

const TEXT_CANDIDATES = [
  'robots.txt',
  'public/robots.txt',
  'static/robots.txt',
  'app/robots.txt',
  'src/robots.txt',
  'llms.txt',
  'public/llms.txt',
  'static/llms.txt',
  'llms-full.txt',
  'public/llms-full.txt',
];

const HTML_EXT = new Set(['.html', '.htm', '.php']);

export async function readIfExists(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

export async function findNamedFile(root, names) {
  for (const relative of names) {
    const full = path.join(root, relative);
    const text = await readIfExists(full);
    if (text !== null) return { path: full, relative, text };
  }
  return null;
}

export async function discoverLocal(root, { maxHtml = 40 } = {}) {
  const robots = await findNamedFile(root, TEXT_CANDIDATES.filter((item) => item.endsWith('robots.txt')));
  const llms = await findNamedFile(root, TEXT_CANDIDATES.filter((item) => item.includes('llms')));
  const htmlFiles = [];
  await walk(root, root, htmlFiles, maxHtml);
  return { root, robots, llms, htmlFiles };
}

async function walk(root, current, htmlFiles, maxHtml) {
  if (htmlFiles.length >= maxHtml) return;
  let entries;
  try {
    entries = await fs.readdir(current, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (htmlFiles.length >= maxHtml) return;
    if (entry.name.startsWith('.') && entry.name !== '.html') {
      if (IGNORE_DIRS.has(entry.name)) continue;
      if (entry.isDirectory()) continue;
    }
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      await walk(root, full, htmlFiles, maxHtml);
      continue;
    }
    if (!HTML_EXT.has(path.extname(entry.name).toLowerCase())) continue;
    const text = await readIfExists(full);
    if (text === null) continue;
    htmlFiles.push({
      path: full,
      relative: path.relative(root, full),
      text,
    });
  }
}
