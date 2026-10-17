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

import org.jahia.osgi.BundleUtils;
import org.jahia.osgi.FrameworkService;
import org.osgi.framework.Bundle;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Enumeration;
import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.locks.ReentrantLock;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Scans every active Jahia module bundle for references to static assets.
 *
 * <p>Two kinds of references are collected:
 * <ul>
 *     <li>quoted strings containing the search pattern (for instance {@code "/modules/assets/css/x.css"}),
 *     found in any text file of the bundle;</li>
 *     <li>{@code <template:addResources resources="..."/>} tags found in JSP files.</li>
 * </ul>
 * When the target bundle is deployed, only the resources that physically exist in that bundle are kept, which
 * answers the question "which files of the assets module are still used, and by whom?".
 */
public final class AssetsUsageScanner {

    private static final Logger logger = LoggerFactory.getLogger(AssetsUsageScanner.class);

    public static final String DEFAULT_SEARCH_PATTERN = "/assets/";
    public static final String DEFAULT_TARGET_BUNDLE = "assets";

    /** Entries larger than this are skipped: they are not templates or scripts worth scanning. */
    public static final long MAX_ENTRY_BYTES = 2L * 1024 * 1024;
    /** The scan stops once this many bytes were read and reports itself as truncated. */
    public static final long MAX_TOTAL_BYTES = 256L * 1024 * 1024;

    /** One scan at a time: it is a synchronous full read of every module bundle. */
    private static final ReentrantLock RUNNING = new ReentrantLock();

    private static final Pattern ADD_RESOURCES_PATTERN = Pattern
            .compile("<template:addResources[^>]*>.*?</template:addResources>|<template:addResources[^>]*/>", Pattern.DOTALL);
    private static final Pattern RESOURCES_ATTR_PATTERN = Pattern.compile("resources\\s*=\\s*[\"']([^\"']*)[\"']");
    private static final Pattern TYPE_ATTR_PATTERN = Pattern.compile("type\\s*=\\s*[\"']([^\"']*)[\"']");
    private static final Pattern BINARY_FILE_PATTERN = Pattern
            .compile(".*\\.(class|jar|zip|png|jpg|jpeg|gif|ico|webp|woff|woff2|ttf|eot|pdf|mp4|mp3|svgz)$", Pattern.CASE_INSENSITIVE);
    private static final Pattern IMAGE_PATTERN = Pattern.compile(".*\\.(png|jpg|jpeg|gif|svg|ico|webp)$", Pattern.CASE_INSENSITIVE);
    private static final String[] TARGET_FOLDERS = {"/css/", "/javascript/", "/js/", "/", "/img/", "/images/", "/icons/"};

    private AssetsUsageScanner() {
        // static utility
    }

    /**
     * Runs the scan.
     *
     * @param searchPattern    the path fragment to look for in quoted strings; defaults to {@value #DEFAULT_SEARCH_PATTERN}
     * @param targetBundleName symbolic name of the bundle that is supposed to hold the resources; defaults to
     *                         {@value #DEFAULT_TARGET_BUNDLE}. When that bundle is active, results are restricted to
     *                         the resources it actually contains.
     * @return the report
     * @throws IllegalStateException when another scan is running
     */
    public static AssetsUsageReport scan(String searchPattern, String targetBundleName) {
        if (!RUNNING.tryLock()) {
            throw new IllegalStateException("A scan is already running, retry in a moment");
        }
        try {
            return doScan(searchPattern, targetBundleName);
        } finally {
            RUNNING.unlock();
        }
    }

    private static AssetsUsageReport doScan(String searchPattern, String targetBundleName) {
        String pattern = isBlank(searchPattern) ? DEFAULT_SEARCH_PATTERN : searchPattern.trim();
        String target = isBlank(targetBundleName) ? DEFAULT_TARGET_BUNDLE : targetBundleName.trim();

        Map<String, Map<String, ResourceUsage>> moduleResources = new TreeMap<>();
        Map<String, ResourceUsage> globalResources = new TreeMap<>();
        Pattern referencePattern = Pattern.compile("[\"'`]([^\"'`]*" + Pattern.quote(pattern) + "[^\"'`]*)[\"'`]");

        Bundle targetBundle = null;
        int scannedModules = 0;
        Budget budget = new Budget();
        for (Bundle bundle : FrameworkService.getBundleContext().getBundles()) {
            if (bundle.getState() == Bundle.ACTIVE && target.equals(bundle.getSymbolicName())) {
                targetBundle = bundle;
            }
            if (BundleUtils.isJahiaModuleBundle(bundle) && bundle.getState() == Bundle.ACTIVE && !budget.exhausted()) {
                scannedModules++;
                logger.debug("Scanning bundle {} for assets usages", bundle.getSymbolicName());
                scanForPattern(bundle, moduleResources, globalResources, referencePattern, pattern, budget);
                scanForTemplateResources(bundle, moduleResources, globalResources, budget);
            }
        }
        moduleResources.entrySet().removeIf(entry -> entry.getValue().isEmpty());

        if (targetBundle != null) {
            keepOnlyResourcesOfTarget(targetBundle, moduleResources, globalResources);
        }
        return new AssetsUsageReport(pattern, target, targetBundle != null, scannedModules, globalResources, moduleResources,
                budget.bytes, budget.exhausted(), budget.skippedEntries);
    }

    /** What the scan has read so far, against {@link #MAX_TOTAL_BYTES}. */
    private static final class Budget {
        long bytes;
        int skippedEntries;

        boolean exhausted() {
            return bytes >= MAX_TOTAL_BYTES;
        }

        /** @return false when the entry must be skipped (too large, or the total budget is spent) */
        boolean admit(URL url) {
            if (exhausted()) {
                return false;
            }
            long size;
            try {
                size = url.openConnection().getContentLengthLong();
            } catch (IOException e) {
                size = -1;
            }
            if (size > MAX_ENTRY_BYTES) {
                skippedEntries++;
                return false;
            }
            bytes += Math.max(size, 0);
            return true;
        }
    }

    private static void keepOnlyResourcesOfTarget(Bundle targetBundle, Map<String, Map<String, ResourceUsage>> moduleResources,
            Map<String, ResourceUsage> globalResources) {
        Map<String, ResourceUsage> filteredGlobal = new TreeMap<>();
        Map<String, Map<String, ResourceUsage>> filteredModule = new TreeMap<>();
        for (Map.Entry<String, ResourceUsage> entry : globalResources.entrySet()) {
            ResourceUsage resource = entry.getValue();
            for (String folder : TARGET_FOLDERS) {
                if (targetBundle.getEntry(folder + resource.getResourcePath()) != null) {
                    resource.setExistsInTarget(true);
                    filteredGlobal.put(entry.getKey(), resource);
                    for (Map.Entry<String, Map<String, ResourceUsage>> moduleEntry : moduleResources.entrySet()) {
                        ResourceUsage moduleUsage = moduleEntry.getValue().get(entry.getKey());
                        if (moduleUsage != null) {
                            filteredModule.computeIfAbsent(moduleEntry.getKey(), k -> new TreeMap<>()).put(entry.getKey(), moduleUsage);
                        }
                    }
                    break;
                }
            }
        }
        globalResources.clear();
        globalResources.putAll(filteredGlobal);
        moduleResources.clear();
        moduleResources.putAll(filteredModule);
    }

    private static void scanForPattern(Bundle bundle, Map<String, Map<String, ResourceUsage>> moduleResources,
            Map<String, ResourceUsage> globalResources, Pattern referencePattern, String patternStr, Budget budget) {
        Enumeration<URL> entries = bundle.findEntries("/", "*", true);
        if (entries == null) {
            return;
        }
        String moduleName = bundle.getSymbolicName();
        while (entries.hasMoreElements()) {
            URL url = entries.nextElement();
            String path = url.getPath();
            if (path.endsWith("/") || BINARY_FILE_PATTERN.matcher(path).matches() || !budget.admit(url)) {
                continue;
            }
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(url.openStream(), StandardCharsets.UTF_8))) {
                String line;
                int lineNum = 0;
                while ((line = reader.readLine()) != null) {
                    lineNum++;
                    Matcher matcher = referencePattern.matcher(line);
                    while (matcher.find()) {
                        String resourcePath = extractResourcePath(matcher.group(1), patternStr);
                        if (resourcePath == null) {
                            continue;
                        }
                        record(moduleResources, globalResources, moduleName, path + ":" + lineNum, resourcePath, typeOf(resourcePath));
                    }
                }
            } catch (IOException | RuntimeException e) {
                logger.debug("Could not read {} while scanning for assets", path, e);
            }
        }
    }

    private static String extractResourcePath(String assetUrl, String patternStr) {
        String resourcePath;
        String modulesPrefix = "/modules" + patternStr;
        if (assetUrl.contains(modulesPrefix)) {
            resourcePath = assetUrl.substring(assetUrl.indexOf(modulesPrefix) + modulesPrefix.length());
        } else if (assetUrl.contains(patternStr)) {
            resourcePath = assetUrl.substring(assetUrl.indexOf(patternStr) + patternStr.length());
        } else {
            return null;
        }
        int queryIdx = resourcePath.indexOf('?');
        if (queryIdx != -1) {
            resourcePath = resourcePath.substring(0, queryIdx);
        }
        int hashIdx = resourcePath.indexOf('#');
        if (hashIdx != -1) {
            resourcePath = resourcePath.substring(0, hashIdx);
        }
        return resourcePath.isEmpty() ? null : resourcePath;
    }

    private static String typeOf(String resourcePath) {
        if (resourcePath.endsWith(".css")) {
            return "css";
        }
        if (resourcePath.endsWith(".js")) {
            return "javascript";
        }
        if (IMAGE_PATTERN.matcher(resourcePath).matches()) {
            return "image";
        }
        return "asset";
    }

    private static void scanForTemplateResources(Bundle bundle, Map<String, Map<String, ResourceUsage>> moduleResources,
            Map<String, ResourceUsage> globalResources, Budget budget) {
        Enumeration<URL> entries = bundle.findEntries("/", "*.jsp", true);
        if (entries == null) {
            return;
        }
        String moduleName = bundle.getSymbolicName();
        while (entries.hasMoreElements()) {
            URL url = entries.nextElement();
            String path = url.getPath();
            if (!budget.admit(url)) {
                continue;
            }
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(url.openStream(), StandardCharsets.UTF_8))) {
                StringBuilder content = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    content.append(line).append('\n');
                }
                String contentStr = content.toString();
                Matcher tagMatcher = ADD_RESOURCES_PATTERN.matcher(contentStr);
                while (tagMatcher.find()) {
                    String tag = tagMatcher.group();
                    int lineNum = countLines(contentStr, tagMatcher.start());
                    Matcher typeMatcher = TYPE_ATTR_PATTERN.matcher(tag);
                    String type = typeMatcher.find() ? typeMatcher.group(1) : "unknown";
                    Matcher resourcesMatcher = RESOURCES_ATTR_PATTERN.matcher(tag);
                    if (!resourcesMatcher.find()) {
                        continue;
                    }
                    for (String resource : resourcesMatcher.group(1).split("[,;]")) {
                        String trimmed = resource.trim();
                        if (!trimmed.isEmpty()) {
                            record(moduleResources, globalResources, moduleName, path + ":" + lineNum, trimmed, type);
                        }
                    }
                }
            } catch (IOException | RuntimeException e) {
                logger.debug("Could not read JSP {} while scanning for template:addResources", path, e);
            }
        }
    }

    private static int countLines(String content, int endIndex) {
        int lines = 1;
        for (int i = 0; i < endIndex && i < content.length(); i++) {
            if (content.charAt(i) == '\n') {
                lines++;
            }
        }
        return lines;
    }

    private static void record(Map<String, Map<String, ResourceUsage>> moduleResources, Map<String, ResourceUsage> globalResources,
            String moduleName, String location, String resourcePath, String type) {
        String key = type + ":" + resourcePath;
        moduleResources.computeIfAbsent(moduleName, k -> new TreeMap<>())
                .computeIfAbsent(key, k -> new ResourceUsage(resourcePath, type))
                .addUsage(location, moduleName);
        globalResources.computeIfAbsent(key, k -> new ResourceUsage(resourcePath, type)).addUsage(location, moduleName);
    }

    private static boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
