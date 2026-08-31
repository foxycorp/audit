# `@foxygeo/audit`

Free CI linter for AI crawler readiness. Checks `llms.txt`, GPTBot/ClaudeBot access, and JSON-LD in about two seconds, then comments the score on a pull request with a public report on [foxygeo.com](https://foxygeo.com/tools/cli-audit).

```bash
npx @foxygeo/audit
npx @foxygeo/audit example.com
npx @foxygeo/audit --ci --publish example.com
```

## GitHub Actions

```yaml
name: FoxyGEO
on: [pull_request]
jobs:
  audit:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npx --yes @foxygeo/audit --ci --publish example.com
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

The PR comment looks like:

> FoxyGEO AI Readiness: 94/100  
> Public audit: https://foxygeo.com/report/example-com

Preview hosts (`*.vercel.app`, `*.netlify.app`, and similar) are never published.

## What it scores

| Check | Weight |
| --- | --- |
| GPTBot / ClaudeBot not blocked at `/` | 40 |
| `llms.txt` present and useful | 30 |
| JSON-LD (`Organization` / `WebSite` / `FAQPage` / …) | 30 |

Local mode reads files in the repo. Domain mode fetches `/robots.txt`, `/llms.txt`, and the homepage.

## Publish later

1. Create the npm org `@foxygeo` and run `npm publish --access public` from this directory.
2. Point the public [`foxycorp/audit`](https://github.com/foxycorp/audit) repository at `action.yml`.
3. Show HN title: `npx @foxygeo/audit — lint llms.txt, GPTBot access, and schema in CI`.

See [PUBLISHING.md](./PUBLISHING.md) for the release gate, Marketplace setup,
and channel order.
