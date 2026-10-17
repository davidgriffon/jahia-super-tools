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

@GraphQLName("SuperToolsCachePagination")
@GraphQLDescription("Pagination information of a cache entries page")
public class GqlCachePagination {

    private final int page;
    private final int pageSize;
    private final int totalEntries;
    private final int totalPages;

    public GqlCachePagination(int page, int pageSize, int totalEntries) {
        this.page = page;
        this.pageSize = pageSize;
        this.totalEntries = totalEntries;
        this.totalPages = (int) Math.ceil((double) totalEntries / pageSize);
    }

    @GraphQLField
    public int getPage() {
        return page;
    }

    @GraphQLField
    public int getPageSize() {
        return pageSize;
    }

    @GraphQLField
    @GraphQLDescription("Number of entries matching the filters")
    public int getTotalEntries() {
        return totalEntries;
    }

    @GraphQLField
    public int getTotalPages() {
        return totalPages;
    }

    @GraphQLField
    public boolean isHasNextPage() {
        return page < totalPages;
    }

    @GraphQLField
    public boolean isHasPreviousPage() {
        return page > 1;
    }
}
