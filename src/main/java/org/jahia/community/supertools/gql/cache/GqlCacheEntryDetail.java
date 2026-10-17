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
import org.jahia.services.cache.CacheEntry;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@GraphQLName("SuperToolsCacheEntryDetail")
@GraphQLDescription("Full content of one HTML output cache entry")
public class GqlCacheEntryDetail extends GqlCacheEntry {

    private final String content;
    private final List<GqlCacheProperty> properties = new ArrayList<>();

    public GqlCacheEntryDetail(String key, Element element) {
        super(key, element);
        Object value = element.getObjectValue();
        if (value instanceof CacheEntry) {
            CacheEntry<?> cacheEntry = (CacheEntry<?>) value;
            Object object = cacheEntry.getObject();
            this.content = object == null ? null : object.toString();
            Map<String, ? extends Object> extendedProperties = cacheEntry.getExtendedProperties();
            if (extendedProperties != null) {
                for (Map.Entry<String, ? extends Object> property : extendedProperties.entrySet()) {
                    properties.add(new GqlCacheProperty(property.getKey(),
                            property.getValue() == null ? null : property.getValue().toString()));
                }
            }
        } else {
            this.content = value == null ? null : value.toString();
        }
    }

    @GraphQLField
    @GraphQLDescription("Cached HTML fragment")
    public String getContent() {
        return content;
    }

    @GraphQLField
    @GraphQLDescription("Extended properties stored with the entry")
    public List<GqlCacheProperty> getProperties() {
        return properties;
    }
}
