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

import javax.jcr.Property;
import javax.jcr.RepositoryException;

@GraphQLName("SuperToolsJcrReference")
@GraphQLDescription("A REFERENCE or WEAKREFERENCE property pointing to a node")
public class GqlJcrReference {

    private final String propertyName;
    private final String propertyPath;
    private final boolean weak;
    private final GqlJcrNodeRef node;

    public GqlJcrReference(Property property, boolean weak) throws RepositoryException {
        this.propertyName = property.getName();
        this.propertyPath = property.getPath();
        this.weak = weak;
        this.node = new GqlJcrNodeRef(property.getParent());
    }

    @GraphQLField
    public String getPropertyName() {
        return propertyName;
    }

    @GraphQLField
    public String getPropertyPath() {
        return propertyPath;
    }

    @GraphQLField
    public boolean isWeak() {
        return weak;
    }

    @GraphQLField
    @GraphQLDescription("The node holding the referencing property")
    public GqlJcrNodeRef getNode() {
        return node;
    }
}
