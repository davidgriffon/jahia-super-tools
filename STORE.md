---
name: jahia-super-tools
groupId: org.jahia.community
title: Jahia Super Tools
artifact: https://github.com/davidgriffon/jahia-super-tools/releases/download/v{version}/jahia-super-tools-{version}.jar
license: Apache-2.0
author: David Griffon
authorUrl: https://github.com/davidgriffon/jahia-super-tools
requiredVersion: 8.2.0.0
dependencies:
  - graphql-dxm-provider
---

# Jahia Super Tools

A set of administration tools for Jahia 8, packaged as one module that plugs into the
**Support Tools**. Once started, the tools appear in the Modules section of the Support Tools
home page and on the module's own landing page, `/modules/jahia-super-tools/index.jsp`.

- **JCR Explorer**: browse and edit the repository as `javax.jcr` sees it, or through a Jahia
  session with a language and an impersonated user.
- **Output cache browser**: inspect, group, search and flush the entries of the HTML output cache.
- **User permissions inspector**: explain why a user or a group has, or has not, a permission on
  a node.
- **Spring bean editor**: read and change the scalar properties of Spring beans at runtime, in
  memory or persisted.
- **Assets usage checker**: find which static resources of a bundle are still referenced by the
  modules, and from where.

All pages require the `systemToolsAccess` permission, like the Support Tools. On a standard
Jahia only `root` holds it.

## Requirements

- Jahia 8.2.0.0 or later.
- The `graphql-dxm-provider` module, part of every Jahia 8.
- The `tools` module is not required, but it is the natural entry point to reach the tools.
