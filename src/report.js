const MARKER = '<!-- foxygeo-audit -->';

export function markdownReport(result, { publicUrl = null } = {}) {
  const icon = result.score >= 85 ? '✅' : result.score >= 60 ? '⚠️' : '❌';
  const rows = [
    `| llms.txt | ${result.readiness.llms.ok ? `pass (${result.readiness.llms.quality})` : 'missing'} |`,
    `| GPTBot | ${result.gptbot === 'allow' ? 'allowed' : 'blocked'} |`,
    `| ClaudeBot | ${result.claudebot === 'allow' ? 'allowed' : 'blocked'} |`,
    `| Schema | ${result.schemaTypes.length ? result.schemaTypes.slice(0, 6).join(', ') : 'none'} |`,
  ];
  const findingLines = result.findings.length
    ? result.findings.map((item) => `- **${item.severity}:** ${item.message}`).join('\n')
    : '- No blocking issues.';
  const link = publicUrl
    ? `\n**Public audit:** ${publicUrl}\n`
    : '\n';
  return `${MARKER}
## ${icon} FoxyGEO AI Readiness: ${result.score}/100

| Check | Status |
| --- | --- |
${rows.join('\n')}
${link}
${findingLines}

<sub>Run locally: <code>npx @foxygeo/audit</code> · [docs](https://foxygeo.com/tools/cli-audit)</sub>
`;
}

export function textReport(result, { publicUrl = null } = {}) {
  const lines = [
    `FoxyGEO AI Readiness: ${result.score}/100`,
    `llms.txt: ${result.readiness.llms.ok ? result.readiness.llms.quality : 'missing'}`,
    `GPTBot: ${result.gptbot}`,
    `ClaudeBot: ${result.claudebot}`,
    `Schema: ${result.schemaTypes.join(', ') || 'none'}`,
  ];
  if (publicUrl) lines.push(`Public audit: ${publicUrl}`);
  for (const finding of result.findings) {
    lines.push(`[${finding.severity}] ${finding.message}`);
  }
  return lines.join('\n');
}

export function jsonReport(result, extras = {}) {
  return {
    tool: 'foxygeo-audit',
    score: result.score,
    ...result,
    ...extras,
  };
}

export function githubAnnotations(result) {
  return result.findings.map((item) => {
    const level = item.severity === 'error' ? 'error' : item.severity === 'warning' ? 'warning' : 'notice';
    return `::${level}::${item.message}`;
  });
}

export { MARKER };
