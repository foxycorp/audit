# Launch `@foxygeo/audit`

## Gate before any public launch

1. Create the `@foxygeo` npm organization and authenticate the release account.
2. Publish the package from this directory:

   ```bash
   npm publish --access public
   ```

3. From a directory outside this repository, prove the public package works:

   ```bash
   npx --yes @foxygeo/audit example.com
   npx --yes @foxygeo/audit --ci --publish example.com
   ```

4. Publish this package in the public [`github.com/foxycorp/audit`](https://github.com/foxycorp/audit) repository
   directory. Keep `action.yml` at its root, tag `v1.0.0`, then publish the
   release as a GitHub Marketplace Action. The Marketplace requires a public
   repository and a root action metadata file.

The product link for general posts is
[`foxygeo.com/tools/cli-audit`](https://foxygeo.com/tools/cli-audit). The
GitHub repository is the better Show HN destination because readers can inspect
and run the code immediately rather than arriving at a marketing page.

## Distribution order

| Priority | Channel | What to publish | Success signal |
| --- | --- | --- | --- |
| 1 | npm | `@foxygeo/audit` | Clean-room `npx` works. |
| 2 | GitHub + Marketplace | Public source, `action.yml`, `v1` release and workflow example | `uses: foxycorp/audit@v1` is copyable. |
| 3 | Show HN | A personally written launch post linking to the GitHub repository | Developers try the CLI and ask implementation questions. |
| 4 | Dev.to / Hashnode | A technical walkthrough with canonical URL set to the tool landing page | Search discovery and workflow copies. |
| 5 | Relevant communities | One useful, rule-compliant post in each community | Qualified runs, not impressions. |
| 6 | X / LinkedIn | A real PR-comment screenshot plus a 15-second terminal recording | Clicks to the tool page and GitHub workflow copies. |

## Channel guidance

### GitHub Marketplace

This is the strongest intent channel: people already looking for a CI action can
install it directly. Keep the dedicated public repository limited to the Action
and its docs. Pin the workflow snippet and tag the first release as `v1` after
testing the immutable tag.

### Show HN

Do not submit until the package is publicly runnable. Show HN is for work that
readers can try without a signup barrier; a landing page alone is not enough.
Use the GitHub repository as the submitted URL and include the `npx` command,
an actual public report and the GitHub Actions example in the project README.

The maker should write the Show HN title and first comment personally. Hacker
News currently asks submitters not to post AI-generated or AI-edited text, and
the thread should be answered by the person who built the tool. Do not ask for
upvotes or coordinated comments.

### Communities worth testing after HN

- `r/webdev`: a practical CI workflow, only if its current self-promotion
  rules permit it.
- `r/github`: GitHub Action angle, with the YAML example.
- `r/SEO`: only the `llms.txt`/crawler-access audit angle; avoid pitching it
  as a generic AI product.
- Indie Hackers: build log and the report-generation architecture, not an ad.
- Dev.to and Hashnode: one detailed implementation article with the canonical
  URL pointing to the FoxyGEO tool page.

Use one channel at a time. Measure clean-room installs, completed audits,
`--publish` reports, GitHub workflow copies, and return usage—not likes.
