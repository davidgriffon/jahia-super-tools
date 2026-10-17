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
package org.jahia.community.supertools.gql.jcr;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;

import javax.jcr.Node;
import javax.jcr.RepositoryException;

/** Identity of a node (parent, ancestor, referenced node), without its content. */
@GraphQLName("SuperToolsJcrNodeRef")
@GraphQLDescription("Identity of a JCR node")
public class GqlJcrNodeRef {

    private final String uuid;
    private final String name;
    private final String path;
    private final String primaryType;

    public GqlJcrNodeRef(Node node) throws RepositoryException {
        this.uuid = node.getIdentifier();
        this.name = node.getName();
        this.path = node.getPath();
        this.primaryType = node.getPrimaryNodeType().getName();
    }

    @GraphQLField
    @GraphQLDescription("Node identifier")
    public String getUuid() {
        return uuid;
    }

    @GraphQLField
    public String getName() {
        return name;
    }

    @GraphQLField
    public String getPath() {
        return path;
    }

    @GraphQLField
    public String getPrimaryType() {
        return primaryType;
    }
}
