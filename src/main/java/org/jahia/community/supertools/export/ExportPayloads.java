/*
 * Copyright (C) 2002-2022 Jahia Solutions Group SA. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.jahia.community.supertools.export;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.jahia.community.supertools.assets.AssetsUsageReport;
import org.jahia.community.supertools.assets.ResourceUsage;
import org.jahia.community.supertools.permissions.PermCheckMatch;
import org.jahia.community.supertools.permissions.PermissionEntry;
import org.jahia.community.supertools.permissions.RoleResult;
import org.jahia.community.supertools.permissions.SitePermGroup;
import org.jahia.community.supertools.permissions.UserPermissionsAnalyzer;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Export documents of the JSP tools. Each page embeds the payload built here in a
 * {@code <script type="application/json">} element; the {@code exporter} bundle turns it into a JSON, CSV or XML file
 * in the browser, so an export never runs the analysis or the scan a second time.
 *
 * <p>Payload: {@code {tool, suffix, data, csv: {columns: [{key, label}], rows: [...]}, xmlRoot, xmlItems}}.</p>
 */
public final class ExportPayloads {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private ExportPayloads() {
    }

    /** The payload of the user permissions inspector for one analysis. */
    public static String permissions(UserPermissionsAnalyzer.Result result, String principal, String nodePath, String workspace,
                                     String site, String checkPermission) {
        Map<String, Object> query = new LinkedHashMap<>();
        query.put("principal", principal);
        query.put("nodePath", nodePath);
        query.put("workspace", workspace);
        query.put("site", blankToNull(site));
        query.put("checkPermission", blankToNull(checkPermission));

        List<Map<String, Object>> roles = new ArrayList<>();
        List<Map<String, Object>> rows = new ArrayList<>();
        for (RoleResult role : result.getRoleResults()) {
            Map<String, Object> view = new LinkedHashMap<>();
            view.put("role", role.getRoleName());
            view.put("grantType", role.getGrantType());
            view.put("principal", role.getMatchedPrincipal());
            view.put("grantedOn", role.getContentGrantPath());
            view.put("roleNode", role.getRoleNodePath());
            view.put("nodePermissions", paths(role.getNodePermissions()));
            List<Map<String, Object>> sitePermissions = new ArrayList<>();
            for (SitePermGroup group : role.getSitePermissions()) {
                Map<String, Object> groupView = new LinkedHashMap<>();
                groupView.put("name", group.getName());
                groupView.put("target", group.getTargetPath());
                groupView.put("permissions", paths(group.getPermissions()));
                sitePermissions.add(groupView);
            }
            view.put("sitePermissions", sitePermissions);
            roles.add(view);

            int before = rows.size();
            for (String permission : paths(role.getNodePermissions())) {
                rows.add(permissionRow(role, "node", role.getContentGrantPath(), permission));
            }
            for (SitePermGroup group : role.getSitePermissions()) {
                for (String permission : paths(group.getPermissions())) {
                    rows.add(permissionRow(role, "site " + group.getName(), group.getTargetPath(), permission));
                }
            }
            if (rows.size() == before) {
                rows.add(permissionRow(role, null, null, null));
            }
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("exportedAt", Instant.now().toString());
        data.put("query", query);
        if (blankToNull(checkPermission) != null) {
            Map<String, Object> check = new LinkedHashMap<>();
            check.put("permission", checkPermission);
            check.put("granted", result.getPermGranted());
            check.put("error", result.getPermCheckError());
            List<Map<String, Object>> matches = new ArrayList<>();
            if (result.getPermCheckMatches() != null) {
                for (PermCheckMatch match : result.getPermCheckMatches()) {
                    Map<String, Object> matchView = new LinkedHashMap<>();
                    matchView.put("role", match.getRoleName());
                    matchView.put("grantType", match.getGrantType());
                    matchView.put("grantedOn", match.getGrantPath());
                    matchView.put("level", match.getLevel());
                    matchView.put("detail", match.getDetail());
                    matches.add(matchView);
                }
            }
            check.put("matches", matches);
            data.put("permissionCheck", check);
        }
        data.put("roles", roles);

        Map<String, String> items = new LinkedHashMap<>();
        items.put("roles", "role");
        items.put("nodePermissions", "permission");
        items.put("sitePermissions", "site");
        items.put("permissions", "permission");
        items.put("matches", "match");
        return payload("permissions", principal + "-" + workspace + nodePath, data,
                columns("role", "Role", "grantType", "Grant type", "principal", "Principal", "grantedOn", "Granted on",
                        "scope", "Scope", "target", "Target", "permission", "Permission"),
                rows, "userPermissions", items);
    }

    /** The payload of the assets usage checker for one scan. */
    public static String assets(AssetsUsageReport report) {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("scannedModules", report.getScannedModules());
        summary.put("scannedBytes", report.getScannedBytes());
        summary.put("truncated", report.isTruncated());
        summary.put("skippedEntries", report.getSkippedEntries());
        summary.put("targetBundleFound", report.isTargetBundleFound());
        summary.put("totalResources", report.getTotalResources());
        summary.put("totalUsages", report.getTotalUsages());
        summary.put("moduleCount", report.getModuleCount());

        List<Map<String, Object>> resources = new ArrayList<>();
        for (ResourceUsage resource : report.getGlobalResources()) {
            Map<String, Object> view = new LinkedHashMap<>();
            view.put("type", resource.getType());
            view.put("path", resource.getResourcePath());
            view.put("existsInTarget", resource.isExistsInTarget());
            view.put("usageCount", resource.getUsageCount());
            view.put("modules", new ArrayList<>(resource.getUsedInModules()));
            resources.add(view);
        }

        List<Map<String, Object>> modules = new ArrayList<>();
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Map.Entry<String, List<ResourceUsage>> entry : report.getModuleResources().entrySet()) {
            List<Map<String, Object>> moduleResources = new ArrayList<>();
            for (ResourceUsage resource : entry.getValue()) {
                Map<String, Object> view = new LinkedHashMap<>();
                view.put("type", resource.getType());
                view.put("path", resource.getResourcePath());
                view.put("usageCount", resource.getUsageCount());
                view.put("files", resource.getUsedInFiles());
                moduleResources.add(view);
                for (String file : resource.getUsedInFiles()) {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("module", entry.getKey());
                    row.put("type", resource.getType());
                    row.put("resource", resource.getResourcePath());
                    row.put("usageCount", resource.getUsageCount());
                    row.put("file", file);
                    rows.add(row);
                }
            }
            Map<String, Object> module = new LinkedHashMap<>();
            module.put("name", entry.getKey());
            module.put("resources", moduleResources);
            modules.add(module);
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("exportedAt", Instant.now().toString());
        data.put("searchPattern", report.getSearchPattern());
        data.put("targetBundle", report.getTargetBundle());
        data.put("summary", summary);
        data.put("resources", resources);
        data.put("modules", modules);

        Map<String, String> items = new LinkedHashMap<>();
        items.put("resources", "resource");
        items.put("modules", "module");
        items.put("files", "file");
        return payload("assets-usage", report.getTargetBundle(), data,
                columns("module", "Module", "type", "Type", "resource", "Resource", "usageCount", "Usages in module", "file", "Used in file"),
                rows, "assetsUsage", items);
    }

    private static Map<String, Object> permissionRow(RoleResult role, String scope, String target, String permission) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("role", role.getRoleName());
        row.put("grantType", role.getGrantType());
        row.put("principal", role.getMatchedPrincipal());
        row.put("grantedOn", role.getContentGrantPath());
        row.put("scope", scope);
        row.put("target", target);
        row.put("permission", permission);
        return row;
    }

    private static List<String> paths(List<PermissionEntry> entries) {
        List<String> paths = new ArrayList<>();
        if (entries != null) {
            for (PermissionEntry entry : entries) {
                paths.add(entry.getPath());
            }
        }
        return paths;
    }

    private static List<Map<String, String>> columns(String... keysAndLabels) {
        List<Map<String, String>> columns = new ArrayList<>();
        List<String> values = Arrays.asList(keysAndLabels);
        for (int i = 0; i + 1 < values.size(); i += 2) {
            Map<String, String> column = new LinkedHashMap<>();
            column.put("key", values.get(i));
            column.put("label", values.get(i + 1));
            columns.add(column);
        }
        return columns;
    }

    private static String payload(String tool, String suffix, Map<String, Object> data, List<Map<String, String>> columns,
                                  List<Map<String, Object>> rows, String xmlRoot, Map<String, String> xmlItems) {
        Map<String, Object> csv = new LinkedHashMap<>();
        csv.put("columns", columns);
        csv.put("rows", rows);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("tool", tool);
        payload.put("suffix", suffix);
        payload.put("data", data);
        payload.put("csv", csv);
        payload.put("xmlRoot", xmlRoot);
        payload.put("xmlItems", xmlItems);
        try {
            return forScriptElement(MAPPER.writeValueAsString(payload));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Cannot serialize the export of " + tool, e);
        }
    }

    /**
     * Makes a JSON text safe inside a {@code <script>} element: no {@code </script>}, no HTML comment opener, and no
     * line separators that old parsers reject. The escapes are plain JSON, so the parsed value is unchanged.
     */
    static String forScriptElement(String json) {
        return json.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
                .replace("\u2028", "\\u2028").replace("\u2029", "\\u2029");
    }

    private static String blankToNull(String value) {
        return value == null || value.trim().isEmpty() ? null : value.trim();
    }
}
