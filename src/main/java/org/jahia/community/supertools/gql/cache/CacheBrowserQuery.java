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
package org.jahia.community.supertools.gql.cache;

import graphql.annotations.annotationTypes.GraphQLDefaultValue;
import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import net.sf.ehcache.Ehcache;
import net.sf.ehcache.Element;
import org.jahia.modules.graphql.provider.dxm.node.GqlJcrWrongInputException;
import org.jahia.services.render.filter.cache.ModuleCacheProvider;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.TreeSet;
import java.util.function.Supplier;

/**
 * Read access to the module output cache ({@link ModuleCacheProvider#getCache()}).
 */
@GraphQLName("SuperToolsCacheQuery")
@GraphQLDescription("HTML output cache browser")
public class CacheBrowserQuery {

    private static final int MAX_PAGE_SIZE = 1000;

    public static class DefaultPage implements Supplier<Object> {
        @Override
        public Object get() {
            return 1;
        }
    }

    public static class DefaultPageSize implements Supplier<Object> {
        @Override
        public Object get() {
            return 50;
        }
    }

    static Ehcache cache() {
        return ModuleCacheProvider.getInstance().getCache();
    }

    @GraphQLField
    @GraphQLDescription("Cache statistics")
    public GqlCacheStats stats() {
        return new GqlCacheStats(cache());
    }

    @GraphQLField
    @GraphQLDescription("Names of the cache key parts, in key order, usable as groupBy values")
    public List<String> keyParts() {
        return CacheKeyParts.names();
    }

    @GraphQLField
    @GraphQLDescription("Paginated list of cache entries, optionally restricted to the keys whose given part equals a value and/or containing a search string")
    public GqlCacheEntryPage entries(
            @GraphQLName("page") @GraphQLDescription("1-based page number") @GraphQLDefaultValue(DefaultPage.class) int page,
            @GraphQLName("pageSize") @GraphQLDescription("Entries per page (max 1000)") @GraphQLDefaultValue(DefaultPageSize.class) int pageSize,
            @GraphQLName("groupBy") @GraphQLDescription("Cache key part used with filterValue (see keyParts)") String groupBy,
            @GraphQLName("filterValue") @GraphQLDescription("Only keys whose groupBy part equals this value") String filterValue,
            @GraphQLName("search") @GraphQLDescription("Only keys containing this text (case-insensitive)") String search) {
        Ehcache cache = cache();
        List<String> keys = filteredKeys(cache, groupBy, filterValue, search);

        int effectivePage = Math.max(page, 1);
        int effectivePageSize = pageSize < 1 || pageSize > MAX_PAGE_SIZE ? 50 : pageSize;
        int start = Math.min((effectivePage - 1) * effectivePageSize, keys.size());
        int end = Math.min(start + effectivePageSize, keys.size());

        List<GqlCacheEntry> entries = new ArrayList<>(end - start);
        for (String key : keys.subList(start, end)) {
            entries.add(new GqlCacheEntry(key, cache.getQuiet(key)));
        }
        return new GqlCacheEntryPage(new GqlCachePagination(effectivePage, effectivePageSize, keys.size()), entries);
    }

    @GraphQLField
    @GraphQLDescription("Full detail of one cache entry, null when it is no longer cached")
    public GqlCacheEntryDetail entry(@GraphQLName("key") @GraphQLNonNull @GraphQLDescription("Full cache key") String key) {
        Element element = cache().getQuiet(key);
        return element == null ? null : new GqlCacheEntryDetail(key, element);
    }

    @GraphQLField
    @GraphQLDescription("Distinct values of a cache key part across all entries, sorted")
    public List<String> groupValues(@GraphQLName("groupBy") @GraphQLNonNull @GraphQLDescription("Cache key part (see keyParts)") String groupBy) {
        int index = CacheKeyParts.indexOf(groupBy);
        if (index == -1) {
            throw new GqlJcrWrongInputException("Unknown cache key part: " + groupBy);
        }
        Set<String> values = new TreeSet<>();
        for (String key : keys(cache())) {
            String value = CacheKeyParts.partOf(key, index);
            if (value != null && !value.isEmpty() && !"{}".equals(value)) {
                values.add(value);
            }
        }
        return new ArrayList<>(values);
    }

    @SuppressWarnings("unchecked")
    private static List<String> keys(Ehcache cache) {
        List<String> keys = new ArrayList<>();
        for (Object key : cache.getKeys()) {
            if (key instanceof String) {
                keys.add((String) key);
            }
        }
        return keys;
    }

    private static List<String> filteredKeys(Ehcache cache, String groupBy, String filterValue, String search) {
        List<String> keys = keys(cache);
        if (groupBy != null && !groupBy.isEmpty() && !"none".equals(groupBy) && filterValue != null && !filterValue.isEmpty()) {
            int index = CacheKeyParts.indexOf(groupBy);
            if (index == -1) {
                throw new GqlJcrWrongInputException("Unknown cache key part: " + groupBy);
            }
            keys.removeIf(key -> !filterValue.equals(CacheKeyParts.partOf(key, index)));
        }
        if (search != null && !search.trim().isEmpty()) {
            String needle = search.trim().toLowerCase(Locale.ROOT);
            keys.removeIf(key -> !key.toLowerCase(Locale.ROOT).contains(needle));
        }
        return keys;
    }
}
