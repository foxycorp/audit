export function extractSchemaTypes(html) {
  const types = new Set();
  if (!html) return [];
  const scriptRe = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRe.exec(html))) {
    const raw = match[1].trim();
    if (!raw) continue;
    try {
      walk(JSON.parse(raw), types);
    } catch {
      // Ignore broken JSON-LD blocks; the linter still reports missing coverage.
    }
  }
  return [...types];
}

function walk(node, types) {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const item of node) walk(item, types);
    return;
  }
  if (typeof node !== 'object') return;
  const value = node['@type'];
  if (typeof value === 'string') types.add(value);
  else if (Array.isArray(value)) {
    for (const item of value) if (typeof item === 'string') types.add(item);
  }
  for (const child of Object.values(node)) walk(child, types);
}
