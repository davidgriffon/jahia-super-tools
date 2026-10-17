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
import net.sf.ehcache.Element;

import java.time.Instant;

@GraphQLName("SuperToolsCacheEntry")
@GraphQLDescription("Summary of one HTML output cache entry")
public class GqlCacheEntry {

    private final String key;
    private final boolean present;
    private final long size;
    private final long hitCount;
    private final String creation;
    private final String expiration;
    private final String lastAccess;
    private final long timeToLive;

    public GqlCacheEntry(String key, Element element) {
        this.key = key;
        if (element == null) {
            this.present = false;
            this.size = 0;
            this.hitCount = 0;
            this.creation = null;
            this.expiration = null;
            this.lastAccess = null;
            this.timeToLive = 0;
        } else {
            this.present = true;
            this.size = element.getSerializedSize();
            this.hitCount = element.getHitCount();
            this.creation = iso(element.getCreationTime());
            this.expiration = iso(element.getExpirationTime());
            this.lastAccess = iso(element.getLastAccessTime());
            this.timeToLive = element.getExpirationTime() - System.currentTimeMillis();
        }
    }

    static String iso(long millis) {
        return Instant.ofEpochMilli(millis).toString();
    }

    @GraphQLField
    @GraphQLDescription("Full cache key")
    public String getKey() {
        return key;
    }

    @GraphQLField
    @GraphQLDescription("False when the entry was evicted between listing and reading")
    public boolean isPresent() {
        return present;
    }

    @GraphQLField
    @GraphQLDescription("Serialized size in bytes")
    public long getSize() {
        return size;
    }

    @GraphQLField
    @GraphQLDescription("Number of hits of this entry")
    public long getHitCount() {
        return hitCount;
    }

    @GraphQLField
    @GraphQLDescription("Creation date (ISO-8601, UTC)")
    public String getCreation() {
        return creation;
    }

    @GraphQLField
    @GraphQLDescription("Expiration date (ISO-8601, UTC)")
    public String getExpiration() {
        return expiration;
    }

    @GraphQLField
    @GraphQLDescription("Last access date (ISO-8601, UTC)")
    public String getLastAccess() {
        return lastAccess;
    }

    @GraphQLField
    @GraphQLDescription("Remaining time to live in milliseconds (negative when expired)")
    public long getTimeToLive() {
        return timeToLive;
    }
}
