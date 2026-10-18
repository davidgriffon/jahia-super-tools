<a href="https://www.jahia.com/">
    <img src="https://www.jahia.com/modules/jahiacom-templates/images/jahia-3x.png" alt="Jahia logo" title="Jahia" align="right" height="60" />
</a>

Jahia Super Tools
=================

A set of administration tools for Jahia 8, packaged as one module that plugs into the
[Support Tools](https://github.com/Jahia/tools). Once started, the tools appear in the **Modules** section of the
Support Tools home page (`/modules/tools/index.jsp`) and on the module's own landing page
(`/modules/jahia-super-tools/index.jsp`).

| Tool | Page | In one line |
|------|------|-------------|
| JCR Explorer | `tools/jcrBrowser.jsp` | Browse and edit the repository as `javax.jcr` sees it, or through a Jahia session with a language and an impersonated user |
| Output cache browser | `tools/cacheBrowser.jsp` | Inspect, group, search and flush the entries of the HTML output cache |
| User permissions inspector | `tools/permissionTester.jsp` | Explain why a user or a group has, or has not, a permission on a node |
| Spring bean editor | `tools/springBeanEditor.jsp` | Read and change the scalar properties of Spring beans at runtime, in memory or persisted |
| Assets usage checker | `tools/assetsUsage.jsp` | Find which static resources of a bundle are still referenced by the modules, and from where |

All pages require the `systemToolsAccess` permission, like the Support Tools.

## Requirements

- Jahia 8.2.0.0 or later.
- The `graphql-dxm-provider` module (part of every Jahia 8): the module declares it as a dependency and does not start
  before it. The JCR Explorer and the cache browser call `/modules/graphql`.
- The `tools` module is not required, but it is the natural entry point to reach the tools.

## Installation

_To be written._

## The tools

### JCR Explorer

Browse and edit the repository node by node, the way the JCR API sees it.

- Tree, breadcrumb, go to path or identifier, `default` / `live` workspace switch.
- Node details: types, mixins, definition, locks, versions, references, and every property with its type, flags and
  declaring type.
- Colour coded context: the session kind on the left edge of the panels (blue-grey for the pure session, teal for
  the Jahia one), the workspace on the top edge (blue for `default`, green for `live`), with matching badges.
- Two sessions: **Pure JCR** shows the raw Jackrabbit repository (translation nodes, protected properties,
  `jcr:system`); **Jahia JCR** uses a Jahia session with a language, hides translation nodes, merges i18n properties
  and shows visibility, validity and permission checks. The Jahia session can impersonate any user.
- Writes: add / edit / remove properties, add nodes, mixins, rename, move, lock, checkin / checkout, restore a
  version, export, remove. Writes are logged. `/jcr:system` is read only; users, groups, roles, permissions,
  settings and ACLs need an explicit confirmation.
- Backed by the module's own GraphQL API `admin.superTools.jcr`, which follows the `javax.jcr` interfaces.

### Output cache browser

Look inside the HTML output cache.

- Statistics (hits, misses, hit rate, sizes).
- Entries paged server side, grouped by any part of the key (site, language, template, ACL, path...), searchable.
- Entry details: parsed key, cached HTML in a sandboxed preview, raw content and properties.
- Flush one entry or the whole cache.

### User permissions inspector

Enter a user or a group (`g:name`), a node path and a workspace. The tool lists the effective roles, where each one is
granted (with a jContent link), the permissions they bring, and tells for a chosen permission which roles grant or
deny it.

### Spring bean editor

Change the String, number, boolean and character properties of a Spring bean of the Jahia core context at runtime,
and inspect those of the module contexts.

- Each value shows its origin: code default, Spring configuration, in-memory change or persisted override.
- Only the beans of the Jahia core context can be edited, in memory or persisted in
  `WEB-INF/etc/spring/applicationcontext-override-tools-bean-editor.xml`. The beans of module contexts are shown read
  only, and the API refuses to write them.
- Values go through getters and setters only. Platform and credential beans (`settingsBean`, data sources, security,
  licensing...) are not editable. Secret-looking properties are masked. Every change is logged.

### Assets usage checker

Find which resources of a bundle (`assets` by default) are referenced by the other modules, and where: for each
resource, the usage count, the modules and the file and line of every reference. The scan runs on submit, one at a
time, within a read budget.

## Security

- Every page matches the Jahia rule `/modules/**/*.jsp = authcJahia, perms[/tools:systemToolsAccess]`, like the
  Support Tools pages, and re-checks the permission itself with the `<st:requireToolsAccess/>` tag, which answers 403
  otherwise. On a standard Jahia only `root` holds `systemToolsAccess` on `/tools`. The JSP fragments and the tag
  library descriptor are not served.
- The GraphQL fields under `admin.superTools` check `systemToolsAccess` for the current user before doing anything.
  The JCR API then works with a system session: it is a tool for administrators, not an API to expose to editors.
- When the `tools` module is installed, its token filter applies to the `/modules/*/tools/*` URLs: the forms of this
  module forward the token, the React pages keep their state in the URL fragment and never add query parameters.
- Everything printed from configuration or repository data is escaped; the jContent links of the permissions
  inspector are percent-encoded when built and attribute-escaped when written.
- A development build (`mvn install -P dev`, `yarn build`) embeds readable sources in the bundles, which are served
  from the unauthenticated static path of the module. Deploy production builds only on shared instances.
- The module uses the `org.jahia.community` group id, so no keymaker signature is required.

## Build

Prerequisites: JDK 11, Maven 3.9, access to the Jahia public Nexus. Node and Yarn are downloaded by the
`frontend-maven-plugin`; a local Node 22 / Yarn 1.22 can be used directly for front-end work.

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 11)
mvn clean install                 # unit tests, production front-end build, module jar
mvn clean install -P dev          # development front-end build (readable bundles, source maps)
```

Front-end only:

```bash
yarn install
yarn build            # development bundle
yarn build:production # minified bundle
yarn watch            # rebuild on change
yarn lint
```

Bundles are written to `src/main/resources/javascript/apps/*.bundle.js` (git-ignored) and loaded by the JSP pages.

## Release

Artifacts are published to [GitHub Packages](https://github.com/davidgriffon?tab=packages) with the Maven release
plugin. Declare the `github` server once in `~/.m2/settings.xml`, with a personal access token that has the
`write:packages` scope:

```xml
<server>
    <id>github</id>
    <username>GITHUB_USER</username>
    <password>GITHUB_TOKEN</password>
</server>
```

```bash
mvn deploy                       # publish the current SNAPSHOT
mvn release:prepare              # bump versions, commit, tag vX.Y.Z, push
mvn release:perform              # check out the tag, build, deploy to GitHub Packages
mvn release:rollback             # undo a failed prepare
```

The release pushes with the SSH URL of `developerConnection`. With an SSH alias for GitHub, pass it as
`-Dgithub.ssh.host=github.com-myalias` to `release:prepare` and `release:perform`, or set that property in an active
profile of `~/.m2/settings.xml`.

## Jahia Store

The module is listed in the Jahia Store as a **git-backed module**: the store reads this repository
and nothing is uploaded. Three files carry what it reads.

- [`STORE.md`](STORE.md) describes the module. Its front matter holds the store fields: `name` and
  `groupId` are the Maven coordinates, `artifact` is the URL of the jar of a version with `{version}`
  in place of the version number, and `requiredVersion` and `dependencies` are read at each tag.
  The Markdown body is the description shown in the store. The fields `name`, `groupId`, `title`
  and `artifact` are mandatory.
- The **tags** of the repository are the versions. A tag is a version when it matches the pattern
  of the store, `1.2.3` or `v1.2.3` by default, so the `vX.Y.Z` tags that `mvn release:prepare`
  creates are picked up as they are, and a pre-release tag such as `v1.2.3-rc1` is not. The version
  number is the tag without its `v`.
- [`CHANGELOG.md`](CHANGELOG.md) holds the release notes, read at each tag.

### Release notes

The store takes the release notes of a version from `CHANGELOG.md` **as it stands at the tag of
that version**, in the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) layout: the text
under the `##` heading that names the version, up to the next `##` heading. Each release therefore
updates the changelog **before** `mvn release:prepare`, so the section is inside the tag.

1. Write the changes of the coming version under `## [Unreleased]`, in the `### Added`,
   `### Changed`, `### Fixed`, `### Removed` and `### Security` groups.
2. Just before the release, rename that section to the version and its date, and open a fresh
   `## [Unreleased]` above it:

   ```markdown
   ## [Unreleased]

   ## [1.2.0] - 2026-10-18
   ### Added
   - The assets usage checker reports the line of every reference.
   ### Fixed
   - The JCR Explorer keeps the impersonated user when the workspace changes.
   ```

3. Commit, then run `mvn release:prepare` and `mvn release:perform`. The tag `v1.2.0` holds the
   section above, and the store renders it as the release notes of version 1.2.0.
4. Nothing else to upload: `artifact` in `STORE.md` points at the jar that `release:perform` deployed to
   GitHub Packages,
   `https://maven.pkg.github.com/davidgriffon/jahia-super-tools/org/jahia/community/jahia-super-tools/1.2.0/jahia-super-tools-1.2.0.jar`.
   GitHub Packages requires a GitHub token to download, even for a public package: the store or the
   person installing the module must present one (`Authorization: Bearer <token>` with the
   `read:packages` scope).

A heading written as `## 1.2.0` or `## v1.2.0` is read too. A version with no section lists in the
store without release notes.

## Tests

Unit tests run with the Maven build. The end-to-end suite lives in [`tests/`](tests/README.md).

## Project layout

```
pom.xml                               Jahia module (parent org.jahia.modules:jahia-modules, packaging bundle)
package.json, webpack.config.js       front-end build (React 19, MUI 7, Apollo Client 3)
src/main/java/org/jahia/community/supertools/
  security/, taglibs/                 systemToolsAccess guard, CSRF token, <st:requireToolsAccess/> tag
  permissions/                        user permissions analyzer
  spring/                             Spring bean editor backend and policy, unit tests in src/test
  assets/                             assets usage scanner and report model
  gql/                                GraphQL extension admin.superTools: cache API, JCR API under gql/jcr
src/main/resources/
  index.jsp                           landing page of the module
  tools/*.jsp                         one JSP per tool; the folder name is what the Support Tools scan
  tools/api/*.jsp                     JSON endpoints of the tools (not listed as tools)
  commons/, css/                      header / footer fragments and stylesheets shared by the pages
  META-INF/supertools.tld             tag library
src/javascript/
  shared/                             Apollo client, theme, mount helper, dialogs
  cache-browser/, jcr-browser/, bean-editor/   the React tools
tests/                                Cypress end-to-end suite
```

## Open-Source

This is an Open-Source module, you can find more details about Open-Source @ Jahia [in this repository](https://github.com/Jahia/open-source).

## License

Apache License, Version 2.0 (see `LICENSE`).
