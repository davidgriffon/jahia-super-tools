# Changelog

All notable changes to this module are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the module follows
[Semantic Versioning](https://semver.org/). The Jahia Store reads the section of a version
from this file as it stands at the tag of that version: see "Release notes" in the README.

## [Unreleased]

## [0.0.1] - 2026-10-18

First version of the module, for Jahia 8.2.0.0 and later. The tools are listed in the Modules
section of the Support Tools home page and on the module landing page.

### Added

- **JCR Explorer**: browse and edit the repository through a GraphQL API that mirrors `javax.jcr`
  (`admin.superTools.jcr`). Pure JCR session on the default provider, or Jahia session with a
  language, visibility, validity and permission checks, and user impersonation. Tree, path and
  identifier navigation, `default` and `live` workspaces, properties with their definitions, copy
  to clipboard, references, versions, locks, add node, mixins, set and remove properties, rename,
  move, checkin and checkout, restore, export, remove. Session and workspace are colour coded.
- **Output cache browser**: statistics, server-side paging, grouping by any key part, search,
  entry details with a sandboxed preview, flush of one entry or of the whole cache
  (`admin.superTools.cache`).
- **User permissions inspector**: effective roles of a user or group on a node, where each role is
  granted, node and site permissions, and a direct check of one permission.
- **Spring bean editor**: read and change the scalar properties of the beans of the Jahia core
  context, in memory or persisted in an override file applied at startup. Module contexts are
  read only.
- **Assets usage checker**: which resources of a bundle are referenced by the modules, with the
  file and line of every reference.
- Cypress end-to-end suite covering every screen, documented in `tests/README.md`.

### Security

- Every page and GraphQL field requires `systemToolsAccess`, like the Support Tools.
- The bean editor only uses getters and setters, hides platform and credential beans, masks
  secret-looking properties, carries its own CSRF protection and logs every change.
- JCR writes are logged; `/jcr:system` is never written and sensitive subtrees need an explicit
  acknowledgement.
- Errors answered to the client name the exception type and a log reference, not the message.
- The assets scan runs on POST only, one at a time, within a read budget.
