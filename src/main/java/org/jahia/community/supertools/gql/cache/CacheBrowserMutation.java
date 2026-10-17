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
import graphql.annotations.annotationTypes.GraphQLNonNull;
import net.sf.ehcache.Ehcache;
import org.jahia.services.render.filter.cache.ModuleCacheProvider;

/**
 * Write access to the module output cache.
 */
@GraphQLName("SuperToolsCacheMutation")
@GraphQLDescription("HTML output cache management")
public class CacheBrowserMutation {

    @GraphQLField
    @GraphQLDescription("Removes one entry from the output cache; returns true when an entry was removed")
    public boolean flushEntry(@GraphQLName("key") @GraphQLNonNull @GraphQLDescription("Full cache key") String key) {
        return ModuleCacheProvider.getInstance().getCache().remove(key);
    }

    @GraphQLField
    @GraphQLDescription("Empties the output cache and its dependencies cache")
    public boolean flushAll() {
        ModuleCacheProvider provider = ModuleCacheProvider.getInstance();
        Ehcache cache = provider.getCache();
        Ehcache dependenciesCache = provider.getDependenciesCache();
        cache.flush();
        cache.removeAll();
        dependenciesCache.flush();
        dependenciesCache.removeAll();
        return true;
    }
}
