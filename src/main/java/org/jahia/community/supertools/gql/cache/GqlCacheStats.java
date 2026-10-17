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

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import net.sf.ehcache.Ehcache;
import org.jahia.services.cache.ehcache.EhCacheStatisticsWrapper;

@GraphQLName("SuperToolsCacheStats")
@GraphQLDescription("Statistics of the HTML output cache")
public class GqlCacheStats {

    private final long cacheHitCount;
    private final long localHeapHitCount;
    private final long localDiskHitCount;
    private final long cacheMissCount;
    private final long size;
    private final long memoryStoreSize;
    private final long diskStoreSize;
    private final long totalSizeBytes;

    public GqlCacheStats(Ehcache cache) {
        EhCacheStatisticsWrapper stats = new EhCacheStatisticsWrapper(cache.getStatistics());
        this.cacheHitCount = stats.getCacheHitCount();
        this.localHeapHitCount = stats.getLocalHeapHitCount();
        this.localDiskHitCount = stats.getLocalDiskHitCount();
        this.cacheMissCount = stats.getCacheMissCount();
        this.size = stats.getSize();
        this.memoryStoreSize = cache.getMemoryStoreSize();
        this.diskStoreSize = cache.getDiskStoreSize();
        this.totalSizeBytes = stats.getLocalHeapSizeInBytes() + stats.getLocalDiskSizeInBytes();
    }

    @GraphQLField
    @GraphQLDescription("Number of cache hits")
    public long getCacheHitCount() {
        return cacheHitCount;
    }

    @GraphQLField
    @GraphQLDescription("Number of hits served from the heap store")
    public long getLocalHeapHitCount() {
        return localHeapHitCount;
    }

    @GraphQLField
    @GraphQLDescription("Number of hits served from the disk store")
    public long getLocalDiskHitCount() {
        return localDiskHitCount;
    }

    @GraphQLField
    @GraphQLDescription("Number of cache misses")
    public long getCacheMissCount() {
        return cacheMissCount;
    }

    @GraphQLField
    @GraphQLDescription("Number of entries in the cache")
    public long getSize() {
        return size;
    }

    @GraphQLField
    @GraphQLDescription("Number of entries in the memory store")
    public long getMemoryStoreSize() {
        return memoryStoreSize;
    }

    @GraphQLField
    @GraphQLDescription("Number of entries in the disk store")
    public long getDiskStoreSize() {
        return diskStoreSize;
    }

    @GraphQLField
    @GraphQLDescription("Heap plus disk size in bytes")
    public long getTotalSizeBytes() {
        return totalSizeBytes;
    }
}
