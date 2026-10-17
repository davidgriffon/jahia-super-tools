<a href="https://www.jahia.com/">
    <img src="https://www.jahia.com/modules/jahiacom-templates/images/jahia-3x.png" alt="Jahia logo" title="Jahia" align="right" height="60" />
</a>

Jahia Super Tools
=================

Companion module for the Jahia [Support Tools](https://github.com/Jahia/tools). It packages, as one standalone
Jahia module, the tools that were prototyped on feature branches of the `tools` repository but never merged:

| Tool | Page | Origin branch(es) |
|------|------|-------------------|
| JCR browser (React, raw JCR API) | `tools/jcrBrowser.jsp` | `feat-new-jcr-browser`, `feat-jcr-browser-by-copilot` |
| Output cache browser | `tools/cacheBrowser.jsp` | `feat-improve-cache`, `feat-improve-cache-moonstone` |
| User permissions inspector | `tools/permissionTester.jsp` | `feat-permission-tester` |
| Assets usage checker | `tools/assetsUsage.jsp` | `feat-assets-usages-checker` |
| Spring bean editor | `tools/springBeanEditor.jsp` | `feat/bean-editor` (uncommitted work of that branch) |

Once the module is started, every tool is listed in the **Modules** section of the Support Tools home page
(`/modules/tools/index.jsp`), and the module has its own landing page at `/modules/jahia-super-tools/index.jsp`.

## Requirements

- Jahia 8.2.0.0 or later (built against the `8.2.0.0` module parent, tested on 8.2.3.0 EE).
- The `graphql-dxm-provider` module (always present on Jahia 8): the module declares it in `Jahia-Depends` and
  does not start before it. The cache browser and the JCR browser talk to `/modules/graphql`.
- The `tools` module is not required, but the tools of this module are meant to be reached from its home page.

## The tools

### JCR browser

A raw **JCR** browser, not a Jahia content browser: it works on the `javax.jcr` session of the default (Jackrabbit)
provider, exactly like the classic `jcrBrowser.jsp` of the Support Tools, through a dedicated GraphQL API of this
module (`admin.superTools.jcr(workspace)`). Nothing goes through Jahia's content-oriented `jcr` GraphQL root, so the
repository is shown as the repository sees it: `j:translation_*` nodes are children, protected properties
(`jcr:primaryType`, `jcr:uuid`, `j:locktoken`...) are listed, `jcr:system` is browsable, there is no language or
publication notion.

The API mirrors the JCR interfaces:

| GraphQL | javax.jcr |
|---------|-----------|
| `jcr(workspace) { node(path, uuid) }` | `Session.getNode`, `Session.getNodeByIdentifier` |
| `node { properties, property(name), children(offset, limit), parent, ancestors, definition, lock, versions, references, isNodeType }` | `Node`, `Property`, `NodeDefinition`, `Lock`, `VersionHistory`, `Node.getReferences` / `getWeakReferences` |
| `jcr { nodeTypes(mixinsOnly, nameContains), nodeType(name) }` | `NodeTypeManager`, `PropertyDefinition`, `NodeDefinition` |
| `mutateNode(path, uuid) { setProperty(name, value, values, type), removeProperty, addMixin, removeMixin, addNode, rename, move, orderBefore, remove }` | `Node.setProperty` (typed through the `ValueFactory`), `Property.remove`, `Node.addMixin`..., `Session.move`, `Node.orderBefore`, `Node.remove` |
| `mutateNode { lock(deep, sessionScoped), unlock, checkin, checkout, restoreVersion }` | `LockManager`, `VersionManager` |

**Two sessions.** `jcr(workspace, mode, language, user)` picks the session the request works on:

- `mode: RAW` (default): the raw `javax.jcr.Session` of the default provider, a system session like the classic
  browser. Translation nodes are children, protected properties are listed, nothing is decorated.
- `mode: JAHIA`: a Jahia `JCRSessionWrapper` (nodes are `JCRNodeWrapperImpl`), opened for the connected user, or
  for the user named by `user` (impersonation), with the locale given by `language`. Internationalized properties are
  merged into the node for that locale (flagged `internationalized` with their `locale`), translation nodes are
  hidden, and each node carries a `jahia { displayableName, existingLocales, visible, valid, hasPermission(name),
  markedForDeletion, lastPublished, lockInfos, lockedLocales, siteKey, nodeTypes }` block backed by
  `VisibilityService.matchesConditions`, `JCRNodeWrapper.checkValidity` and `hasPermission`. Writes go through the
  wrapper too, so `setProperty` on an i18n property lands in the translation node of the session language.

`session { mode, userId, language, impersonated, system }` echoes what was opened and `languages` lists the languages
declared by the sites. Impersonation switches Jahia's current user only for the time of the session lookup and
restores it right after: Jahia caches request sessions per user name, so the connected user keeps its own session for
the rest of the request. Reading a node the impersonated user cannot see fails with the repository's own
`PathNotFoundException`, exactly as it would for that user.

Every mutation is one transaction: the session is saved on success and refreshed on failure, and every write is
recorded in the server log (`SuperToolsJcrNodeMutation` logger: user, operation, path, workspace and session).
`/jcr:system` is never written; a write under `/users`, `/groups`, `/roles`, `/permissions`, `/settings`, a site's
users or groups, or a `j:acl` subtree needs `acknowledgeSensitive: true`, which the page sends after an explicit
confirmation. The `live` workspace is writable directly, without any publication record: that is the point of a raw
browser, and the reason the tool is reserved to `systemToolsAccess` holders. `unlock` adds the token Jahia stores in
`j:locktoken` when the raw unlock is refused, and falls back to Jahia's `clearAllLocks` for its own lock types. The session is the per-request system session of Jahia (the classic browser impersonates root the same
way); access is guarded by the `systemToolsAccess` check of the module.

The React page starts with a session bar: *Pure JCR* / *Jahia JCR* toggle and, for a Jahia session, a language
selector and an *Impersonate user* field (the bar shows the user and locale the session was opened with). With a
Jahia session a *Jahia view* panel shows the displayable name, the visibility and validity checks, the existing
translations (click one to switch the language), Jahia lock information and a permission check for the session user.
Then: a tree of the repository loaded level by level (100 children per request, "load more" beyond),
navigation by path or identifier with a breadcrumb, workspace toggle (`default` / `live`), a node header (identifier,
depth and index, primary type with its supertypes, mixins, definition in the parent type, lock details, checkin
state), the property table (type, cardinality, declaring type and definition name, protected / mandatory /
autocreated flags, references resolved to their path, binary sizes), and the operations above through dialogs:
add node (with the registered types as suggestions), add mixin, add / edit / remove property with a `PropertyType`
selector, rename, move, lock (shallow or deep), unlock, checkin / checkout, version history with restore, references,
export (Jahia export servlet) and remove. The current node, workspace, session mode, language and impersonated user live in the URL fragment.

### Output cache browser

Browses the HTML output cache (`ModuleCacheProvider.getCache()`), the cache behind `ehcache_cj.jsp`.

- Statistics (hits, misses, hit rate, heap and disk sizes).
- Server-side pagination, grouping by any part of the cache key (site, language, template, ACL, path...) with the
  list of existing values, text search inside keys, client-side sorting.
- Detail dialog: parsed key (each `CacheKeyPartGenerator` part named), the cached HTML rendered in a sandboxed
  frame (opaque origin, no script: author markup never runs in the tools origin) and as raw text, extended
  properties, raw key with copy.
- Content preview column, flush of one entry, flush of the whole cache (output and dependencies caches).

The data comes from a GraphQL extension of this module: `admin { superTools { cache { stats, entries, entry,
groupValues, keyParts } } }` and `mutation { admin { superTools { cache { flushEntry, flushAll } } } }`.

### User permissions inspector

Unchanged port of the `feat-permission-tester` tool. Given a user (or `g:group`), a node path and a workspace it
lists every effective role, the node where each role is granted (with a jContent deep link), the node and site level
permissions, and runs a direct `hasPermission()` check for one chosen permission, explaining which roles grant or
deny it.

### Spring bean editor

Port of the `feat/bean-editor` work. Pick a Spring context (the Jahia core context or the context of a module that
has one), then one of its instantiated singleton beans, to view and change its String, number, boolean and character
values at runtime, without a restart. Each value shows where it comes from: the code default, the Spring
configuration, a change made in memory, or a persisted override. For the core context a change can also be persisted
in `WEB-INF/etc/spring/applicationcontext-override-tools-bean-editor.xml` (a `PropertyOverrideConfigurer`), so it is
applied again at every startup; module beans only change in memory until the module or the server restarts.

Guard rails, answering an internal security review of the module:

- Only JavaBean accessors are used: a value is read through its getter and written through its setter. Private
  fields are never read nor written, so the editor shows and changes the public contract of a bean only.
- `SpringBeanEditorPolicy` denies the beans that drive the platform or hold credentials: `settingsBean`, data
  sources, session factories, security, authentication, licensing and secret-bearing beans (matched on the bean name
  and the class name). They are neither listed nor reachable by name.
- Properties whose name looks like a secret (`password`, `secret`, `token`, `key`, `salt`...) are listed masked,
  never editable and never persisted.
- Every change, restore, persist and unpersist is written to the server log (`SpringBeanEditorSave` logger) with the
  user, the context, the bean, the property and the old and new values.
- The page asks for a confirmation before touching the core context, and lists what the override file currently
  pins at the bottom of the page (`action=overrides` of the API).
- The JSON API `tools/api/springBeanEditor.jsp` carries its own CSRF protection: a POST needs a same-origin
  `Origin`/`Referer` header and the per-session token the page received (`X-SuperTools-Csrf`), whether or not the
  `tools` module and its token filter are installed. Unexpected failures are logged with a reference and answered
  with a generic message.

The Java part (`SpringBeanEditorHelper`, `SpringBeanEditorSave`, `SpringBeanOverrideStore`, `SpringBeanEditorViews`)
comes from the branch with these rules added; its unit tests cover them. The UI was rewritten on MUI, the original
used Moonstone with React 18.

### Assets usage checker

Port of the `feat-assets-usages-checker` servlet as a JSP backed by `AssetsUsageScanner`. It scans every active
module for quoted strings containing a pattern (`/assets/` by default) and for `<template:addResources>` tags, then
keeps the resources that exist in the target bundle (`assets` by default). The report shows the usage count of each
resource, the modules using it and the exact file and line of every reference. The scan is a synchronous full read
of the bundles, so it only runs on an explicit POST of the form, one scan at a time, skips entries above 2 MB and
stops after 256 MB (the report then says it is partial).

## Security

- Every JSP of a module matches the Jahia Shiro rule `/modules/**/*.jsp = authcJahia, perms[/tools:systemToolsAccess]`,
  so the pages require the same privilege as the Support Tools. Each page also starts with
  `<st:requireToolsAccess/>`, a tag that re-checks the permission and answers 403 otherwise (defence in depth, same
  pattern as the `tools` module).
- The GraphQL fields under `admin.superTools` check `systemToolsAccess` on `/tools` for the current user before
  answering. The raw JCR API then works with a system session, like the classic JCR browser: it is a tool for
  administrators, not an API to expose to editors.
- When the `tools` module is installed, its `ToolsAccessTokenFilter` applies to `/modules/*/tools/*` URLs: any request
  carrying a query string must carry a valid `toolAccessToken` (except in development mode). The two JSP forms of this
  module (permissions inspector, assets checker) forward the token; the React tools keep their state in the URL
  fragment and never add query parameters.
- The module uses the `org.jahia.community` group id so that no keymaker signature is required.
- Everything the pages print from configuration or repository data is escaped (`fn:escapeXml`, `<c:out>`), the
  jContent deep links of the permissions inspector included: node names and site keys are percent-encoded when the
  link is built and attribute-escaped when it is written.
- A development build (`mvn install -P dev`, `yarn build`) embeds readable sources in the bundles, which are served
  from the unauthenticated static path of the module. Deploy production builds only on shared instances.
- These rules answer an internal security review kept outside the repository. Run `yarn audit` in `tests/`
  (`yarn audit` script) when bumping the Cypress toolchain; the shipped bundle and the test project both audit clean
  today.

## Build

Prerequisites: JDK 11, Maven 3.9, access to the Jahia public Nexus. Node and Yarn are downloaded by the
`frontend-maven-plugin`, but a local Node 22 / Yarn 1.22 can be used directly for front-end work.

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 11)
mvn clean install                 # unit tests, production front-end build + bundle
mvn clean install -P dev          # development front-end build (readable bundles, source maps)
```

Front-end only:

```bash
yarn install
yarn build            # development bundle
yarn build:production # minified bundle
yarn watch            # rebuild on change, then redeploy the jar or copy the bundle into the running module
yarn lint
```

Bundles are written to `src/main/resources/javascript/apps/*.bundle.js` (git-ignored) and loaded by the JSP shells.

## End-to-end tests

`tests/` is a Cypress project built on [`@jahia/cypress`](https://www.npmjs.com/package/@jahia/cypress). It runs
against a live Jahia where the module is deployed and covers every screen:

| Spec | What it checks |
|------|----------------|
| `access.spec.ts` | every page and the GraphQL API deny anonymous callers and serve an administrator |
| `index.spec.ts` | the landing page lists the five tools, their links answer, the Support Tools home lists them |
| `jcrBrowser.spec.ts` | the raw API (translation nodes, protected properties, workspace and path errors), details, tree, path and tree navigation, property filter, edit of a translation node property, mixin and property add/remove, add node, lock/unlock, rename, move, remove, live workspace, and the Jahia session (i18n properties, visibility and validity, permission check, impersonation of guest, unknown user, i18n write), on a folder created under the system site |
| `cacheBrowser.spec.ts` | statistics, grouping, search, details dialog with the sandboxed preview, GraphQL pagination, single and global flush (the cache is seeded by rendering the system site home page) |
| `permissionTester.spec.ts` | the suite of the `feat-permission-tester` branch: direct, group and combined grants on a test user and group |
| `assetsUsage.spec.ts` | form defaults, a scan of the assets bundle (POST), the warning for an unknown bundle, URL prefill without scanning |
| `springBeanEditor.spec.ts` | the JSON API (contexts, beans minus the denied ones, bean view, masked secrets, error cases, CSRF refusals), an in-memory edit of `ehCacheProvider` confirmed then put back, the overrides panel |

The React pages expose `data-testid` hooks for the specs. Run the suite with Node 20.19 or later:

```bash
cd tests
yarn install
JAHIA_URL=http://localhost:8080 JAHIA_PROCESSING_URL=http://localhost:8080 SUPER_USER_PASSWORD=root1234 yarn e2e:ci
# interactive runner: same variables with yarn e2e:debug
```

Reports land in `tests/results` (mochawesome JSON and JUnit XML). The suite creates and removes its own content
(`/sites/systemsite/contents/st-cypress-jcr`, the `up-test-user` user and `up-test-group` group) and flushes the output
cache of the instance.

## Deploy

On a running Jahia (for instance the Docker instance of the dev loop):

```bash
curl -s --user root:<password> --form bundle=@target/jahia-super-tools-0.0.1.jar --form start=true \
     http://localhost:8080/modules/api/bundles
```

Or drop the jar in the `digital-factory-data/modules` folder, or use the module management UI.

Then open `http://localhost:8080/modules/jahia-super-tools/index.jsp` or the Support Tools home page.

## Project layout

```
pom.xml                               Jahia module (parent org.jahia.modules:jahia-modules:8.2.0.0, packaging bundle)
package.json, webpack.config.js       front-end build (React 19, MUI 7, Apollo Client 3)
src/main/java/org/jahia/community/supertools/
  security/, taglibs/                 systemToolsAccess guard and <st:requireToolsAccess/> tag
  permissions/                        user permissions analyzer (from feat-permission-tester)
  spring/                             Spring bean editor backend (from feat/bean-editor), unit tests in src/test
  assets/                             assets usage scanner and report model
  gql/                                GraphQL extension: admin.superTools (cache browser API, raw JCR API under gql/jcr)
src/main/resources/
  index.jsp                           landing page of the module
  tools/*.jsp                         one JSP per tool; the folder name is what ModuleToolsHelper scans
  tools/api/*.jsp                     JSON endpoints of the tools (not listed as tools)
  commons/, css/                      header / footer fragments and stylesheets shared by the pages
  META-INF/supertools.tld             tag library
src/javascript/
  shared/                             Apollo client, theme, mount helper, dialogs
  cache-browser/, jcr-browser/, bean-editor/   the React tools
tests/                                Cypress end-to-end suite (see above)
```

## Open-Source

This is an Open-Source module, you can find more details about Open-Source @ Jahia [in this repository](https://github.com/Jahia/open-source).

## License

Apache License, Version 2.0 (see `src/main/resources/META-INF/LICENSE.txt`).
