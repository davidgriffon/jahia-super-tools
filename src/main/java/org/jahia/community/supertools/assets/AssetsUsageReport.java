/*
 * Copyright (C) 2002-2025 Jahia Solutions Group SA. All rights reserved.
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
package org.jahia.community.supertools.assets;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Result of an {@link AssetsUsageScanner} run: resources found globally and per module, plus a few counters.
 */
public class AssetsUsageReport {

    private final String searchPattern;
    private final String targetBundle;
    private final boolean targetBundleFound;
    private final int scannedModules;
    private final Map<String, ResourceUsage> globalResources;
    private final Map<String, Map<String, ResourceUsage>> moduleResources;
    private final long scannedBytes;
    private final boolean truncated;
    private final int skippedEntries;

    AssetsUsageReport(String searchPattern, String targetBundle, boolean targetBundleFound, int scannedModules,
            Map<String, ResourceUsage> globalResources, Map<String, Map<String, ResourceUsage>> moduleResources,
            long scannedBytes, boolean truncated, int skippedEntries) {
        this.searchPattern = searchPattern;
        this.targetBundle = targetBundle;
        this.targetBundleFound = targetBundleFound;
        this.scannedModules = scannedModules;
        this.globalResources = globalResources;
        this.moduleResources = moduleResources;
        this.scannedBytes = scannedBytes;
        this.truncated = truncated;
        this.skippedEntries = skippedEntries;
    }

    /** Bytes read from the bundles. */
    public long getScannedBytes() {
        return scannedBytes;
    }

    /** Whether the scan stopped because the read budget was spent: the report is then partial. */
    public boolean isTruncated() {
        return truncated;
    }

    /** Entries larger than the per-entry limit, left out. */
    public int getSkippedEntries() {
        return skippedEntries;
    }

    public String getSearchPattern() {
        return searchPattern;
    }

    public String getTargetBundle() {
        return targetBundle;
    }

    public boolean isTargetBundleFound() {
        return targetBundleFound;
    }

    public int getScannedModules() {
        return scannedModules;
    }

    public boolean isEmpty() {
        return globalResources.isEmpty();
    }

    public int getTotalResources() {
        return globalResources.size();
    }

    public int getTotalUsages() {
        return globalResources.values().stream().mapToInt(ResourceUsage::getUsageCount).sum();
    }

    public int getModuleCount() {
        return moduleResources.size();
    }

    /** Resources sorted by descending usage count. */
    public List<ResourceUsage> getGlobalResources() {
        List<ResourceUsage> sorted = new ArrayList<>(globalResources.values());
        sorted.sort(Comparator.comparingInt(ResourceUsage::getUsageCount).reversed());
        return sorted;
    }

    /** Module symbolic name to its resources, sorted by descending usage count. */
    public Map<String, List<ResourceUsage>> getModuleResources() {
        Map<String, List<ResourceUsage>> result = new TreeMap<>();
        for (Map.Entry<String, Map<String, ResourceUsage>> entry : moduleResources.entrySet()) {
            List<ResourceUsage> sorted = new ArrayList<>(entry.getValue().values());
            sorted.sort(Comparator.comparingInt(ResourceUsage::getUsageCount).reversed());
            result.put(entry.getKey(), sorted);
        }
        return result;
    }
}
