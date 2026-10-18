# End-to-end tests

A Cypress project built on [`@jahia/cypress`](https://www.npmjs.com/package/@jahia/cypress). It runs against a live
Jahia where the module is deployed and covers every screen of the module.

## Running

Node 20.19 or later. The three environment variables below must be set together (a partial override breaks the
authentication of `@jahia/cypress`).

```bash
cd tests
yarn install
JAHIA_URL=http://localhost:8080 JAHIA_PROCESSING_URL=http://localhost:8080 SUPER_USER_PASSWORD=root1234 yarn e2e:ci
# interactive runner: same variables with yarn e2e:debug
# one spec:          ... yarn e2e:ci --spec cypress/e2e/jcrBrowser.spec.ts
```

Reports land in `results/`: mochawesome JSON under `results/reports`, JUnit XML under `results/xml_reports`,
screenshots of failures under `results/screenshots`. `yarn report:merge` then `yarn report:html` turn the JSON files
into one HTML report. `yarn audit` checks the toolchain for known vulnerabilities.

## What the suite does to the instance

The suite creates and removes its own data. What it touches on the instance:

- a content folder `/sites/systemsite/contents/st-cypress-jcr` with a text node, created before the JCR Explorer spec
  and removed after it;
- a user `st-plain-user` without any role, created before the access spec and removed after it;
- a user `up-test-user` and a site-scoped group `up-test-group` of the system site, created before the permissions
  inspector spec and removed after it;
- the HTML output cache is seeded by rendering the system site home page as an anonymous visitor, then flushed by the
  last cache browser tests;
- the Spring bean editor spec changes `ehCacheProvider.groupsSizeLimit` in memory and puts it back; nothing is
  persisted.

## Specs

| Spec | What it checks |
|------|----------------|
| `access.spec.ts` | every page and the GraphQL API deny anonymous callers and logged-in users without the tools permission, and serve an administrator |
| `index.spec.ts` | the landing page lists the five tools, their links answer, the Support Tools home page lists them |
| `jcrBrowser.spec.ts` | the raw API (translation nodes, protected properties, workspace and path errors), node details, tree, navigation by path and through the tree, property filter, edit of a translation node property, mixin and property add/remove, add node, lock/unlock, rename, move, remove, live workspace; and the Jahia session: internationalized properties, visibility and validity checks, permission check, impersonation of `guest`, unknown user, switch back to the pure session, internationalized write |
| `cacheBrowser.spec.ts` | statistics, grouping by site and by language, search, details dialog with the sandboxed preview and the tabs, GraphQL pagination and group values, flush of one entry, flush of the whole cache |
| `permissionTester.spec.ts` | form rendering, empty and error states, direct user grant, group grant (membership resolved through the site), group principal lookup, combined grants |
| `assetsUsage.spec.ts` | form defaults, a scan of the assets bundle (POST), the warning for an unknown bundle, URL prefill without scanning |
| `springBeanEditor.spec.ts` | the JSON API (contexts, beans minus the denied ones, bean view, masked secrets, error cases, CSRF refusals), an in-memory edit confirmed then put back, discard and reload, the module context hint, the persisted overrides panel |

## Conventions

- The React pages expose `data-testid` hooks; the specs select elements through them, never through generated MUI
  class names. `cypress/support/helpers.ts` holds the page URLs, the test id helper and the GraphQL helpers.
- GraphQL assertions go through `cy.apollo` (basic authentication of the super user). Direct calls to the bean editor
  JSON API go through `cy.request`, which carries the session opened by `cy.login()`.
- A Mocha nested `describe` runs after the sibling `it`s of its parent: a nested test must not assume it runs first
  when a sibling changes the data it reads.
- `cypress.config.ts` lists the pages of the module in `SUPER_TOOLS_PAGES`; add a page there when adding a tool.
